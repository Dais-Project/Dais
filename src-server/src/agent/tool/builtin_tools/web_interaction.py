import asyncio
import base64
import json
import httpx
import trafilatura
import xml.etree.ElementTree as ET
from magika import ContentTypeLabel
from typing import Annotated, Any, Literal, cast, override
from dais_sdk.types import AudioBlock, Base64Source, ContentBlock, ImageBlock, TextBlock, VideoBlock
from pydantic import BaseModel, Discriminator, Field, field_validator
from trafilatura.settings import use_config
from src.db.models import toolset as toolset_models
from src.utils import MarkdownConverter
from ..toolset_wrapper import builtin_tool, BuiltinToolDefaults, BuiltinToolset, BuiltinToolsetContext
from ...utils import get_magika


DEFAULT_HEADER = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}
MAX_MEDIA_CONTENT_BLOCK_BYTES = 50 * 1024 * 1024

class FormBody(BaseModel):
    type: Literal["form"]
    data: dict[str, str]

    def to_params(self) -> dict[str, Any]:
        return {"data": self.data}

class JsonBody(BaseModel):
    type: Literal["json"]
    data: Annotated[str, Field(description="The JSON string.")]

    @field_validator("data")
    def must_be_valid_json(cls, v):
        try:
            json.loads(v)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}")
        return v

    def to_params(self) -> dict[str, Any]:
        return {"json": json.loads(self.data)}

class TextBody(BaseModel):
    type: Literal["text"]
    data: str

    def to_params(self) -> dict[str, Any]:
        return {"content": self.data,
                "headers": {"Content-Type": "text/plain; charset=utf-8"},}

type FetchBody = Annotated[
    FormBody | JsonBody | TextBody,
    Discriminator("type"),
]

class WebInteractionToolset(BuiltinToolset):
    def __init__(self,
                 ctx: BuiltinToolsetContext,
                 toolset_ent: toolset_models.Toolset | None = None):
        super().__init__(ctx, toolset_ent)
        self._magika = get_magika()
        self._markdown_converter = MarkdownConverter()
        self._trafilatura_config = use_config()

    @property
    @override
    def name(self) -> str: return "WebInteraction"

    @builtin_tool(validate=True, defaults=BuiltinToolDefaults(auto_approve=False))
    async def fetch(self,
                    url: Annotated[str, "The URL to fetch, should include the protocol (http:// or https://)."],
                    method: Literal["GET", "POST", "PUT", "DELETE", "PATCH"] = "GET",
                    headers: dict[str, str] | None = None,
                    body: FetchBody | None = None,
                    raw: Annotated[bool, "Whether to return the original response body, you can set this to True when the original HTML response is needed."] = False,
                    ) -> ET.Element | list[ContentBlock]:
        """
        Execute HTTP/HTTPS requests to fetch web pages, interact with REST APIs, download source code, or submit data.
        Use this tool when you need to browse the internet, retrieve external documentation, read remote config files/code, or call web services.

        Content Handling:
            - General Text (Code, Configs, JSON, CSV, Plain Text): Returned directly as-is.
            - HTML Pages: By default (raw=False), HTML is intelligently extracted into clean, readable Markdown (stripping navbars, ads, and footers). If you need to parse specific DOM elements or the extraction fails, set `raw=True` to get the original HTML.
            - Media Files (images, audio, video): Returned as a ContentBlock array when the response is successful.
            - Binary Files (PDF, DOCX, PPTX, XLSX, EPUB): Automatically converted to Markdown for direct reading.
              Other binary types (e.g., archives) are not converted and return a placeholder (e.g., `[Binary Data: application/zip]`).
            - Redirects: Automatically followed and recorded in the result.

        Body Payload Construction:
            When using POST, PUT, or PATCH, you must structure the `body` dictionary precisely according to the desired content type:
            - JSON Payload: `{"type": "json", "data": "{\\"key\\": \\"value\\"}"}` (Note: `data` MUST be a stringified JSON).
            - Form Data: `{"type": "form", "data": {"key": "value"}}` (Note: `data` is a key-value dictionary).
            - Plain Text: `{"type": "text", "data": "Raw text content"}`

        Examples:
            # 1. Read a blog post (returns clean Markdown)
            >>> fetch("https://example.com/article", method="GET")

            # 2. Fetch raw source code or config files (returns original text)
            >>> fetch("https://raw.githubusercontent.com/user/repo/main/config.yaml")

            # 3. Submit data to an API
            >>> fetch(
                    url="https://httpbin.org/post",
                    method="POST",
                    body={"type": "json", "data": "{\\"name\\": \\"Agent\\", \\"role\\": \\"AI\\"}"}
                )

        Returns:
            An XML string representing the response.

            For successful requests (status < 400):
            <document>
                <url>https://final-url-after-redirects.com</url>
                <status_code>200</status_code>
                <reason_phrase>OK</reason_phrase>
                <redirects>
                    <!-- Empty if no redirects occurred -->
                    <redirect status_code="301" reason_phrase="Moved Permanently" location="..."/>
                </redirects>
                <document_content>...[Markdown, Code, JSON, or HTML content]...</document_content>
            </document>

            For failed requests (status >= 400):
            <error>
                <url>...</url>
                <status_code>404</status_code>
                <reason_phrase>Not Found</reason_phrase>
                <redirects>...</redirects>
                <text>...[Error response body]...</text>
            </error>
        """

        async def read_media_content_block(
            res: httpx.Response,
            media_type: Literal["image", "audio", "video"],
            mime_type: str,
        ) -> ContentBlock:
            content_length = len(res.content)
            if content_length > MAX_MEDIA_CONTENT_BLOCK_BYTES:
                raise ValueError(
                    f"Response from {res.url} is too large to return as a ContentBlock "
                    f"({content_length} bytes, max {MAX_MEDIA_CONTENT_BLOCK_BYTES} bytes)."
                )

            encoded = await asyncio.to_thread(base64.b64encode, res.content)
            source = Base64Source(mime_type=mime_type, data=encoded.decode("ascii"))
            match media_type:
                case "image": return ImageBlock(source=source)
                case "audio": return AudioBlock(source=source)
                case "video": return VideoBlock(source=source)

        async def extract_fetch_content(res: httpx.Response, raw: bool, content_type: Any) -> str:
            if res.status_code == 204: return ""
            if not content_type.output.is_text:
                if self._markdown_converter.is_convertable_binary(content_type.output.label):
                    result = await self._markdown_converter.convert(res.content)
                    return result
                return f"[Binary Data: {content_type.output.label}]"
            elif content_type.output.label == ContentTypeLabel.HTML and not raw:
                extracted = await asyncio.to_thread(
                    trafilatura.extract,
                    res.text,
                    output_format="markdown",
                    config=self._trafilatura_config)
                if extracted is not None: return extracted
                return f"<!-- trafilatura failed to extract content -->\n\n{res.text}"
            else: return res.text

        def format_redirects(redirects: list[httpx.Response]) -> ET.Element:
            redirects_el = ET.Element("redirects")
            for r in redirects:
                ET.SubElement(redirects_el, "redirect", attrib={
                    "status_code": str(r.status_code),
                    "reason_phrase": r.reason_phrase,
                    "location": r.headers.get("location", ""),
                })
            return redirects_el

        def format_fetch_error(res: httpx.Response) -> ET.Element:
            error_root = ET.Element("error")
            ET.SubElement(error_root, "url").text = str(res.url)
            ET.SubElement(error_root, "status_code").text = str(res.status_code)
            ET.SubElement(error_root, "reason_phrase").text = res.reason_phrase
            error_root.append(format_redirects(res.history))
            ET.SubElement(error_root, "text").text = res.text
            return error_root

        async def format_fetch_result(res: httpx.Response, raw: bool) -> ET.Element | list[ContentBlock]:
            fetch_root = ET.Element("fetch")
            ET.SubElement(fetch_root, "url").text = str(res.url)
            ET.SubElement(fetch_root, "status_code").text = str(res.status_code)
            ET.SubElement(fetch_root, "reason_phrase").text = res.reason_phrase
            fetch_root.append(format_redirects(res.history))

            content_type = await asyncio.to_thread(self._magika.identify_bytes, res.content)
            if content_type.output.group in {"image", "audio", "video"}:
                media_type = cast(Literal["image", "audio", "video"], content_type.output.group)
                media_block = await read_media_content_block(res, media_type, content_type.output.mime_type)
                return [TextBlock(text=ET.tostring(fetch_root, encoding="unicode")), media_block]

            ET.SubElement(fetch_root, "document_content").text =\
                await extract_fetch_content(res, raw, content_type)
            return fetch_root

        request_kwargs: dict[str, Any] = {"headers": DEFAULT_HEADER.copy()}
        if body is not None:
            request_kwargs.update(body.to_params())
        if headers is not None:
            request_kwargs["headers"].update(headers)
        req = httpx.Request(method, url, **request_kwargs)
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            res = await client.send(req)

        if res.status_code >= 400:
            return format_fetch_error(res)
        return await format_fetch_result(res, raw)
