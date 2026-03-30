import asyncio
import json
import httpx
import trafilatura
import xml.etree.ElementTree as ET
from magika import Magika, ContentTypeLabel
from typing import Annotated, Any, Literal, override
from pydantic import BaseModel, Discriminator, Field, field_validator
from src.db.models import toolset as toolset_models
from ..toolset_wrapper import built_in_tool, BuiltInToolDefaults, BuiltInToolset, BuiltInToolsetContext

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

class WebInteractionToolset(BuiltInToolset):
    def __init__(self,
                 ctx: BuiltInToolsetContext,
                 toolset_ent: toolset_models.Toolset | None = None):
        super().__init__(ctx, toolset_ent)
        self._magika = Magika()

    @property
    @override
    def name(self) -> str: return "WebInteraction"

    async def _extract_fetch_content(self, res: httpx.Response, raw: bool) -> str:
        if res.status_code == 204: return ""
        content_type = await asyncio.to_thread(self._magika.identify_bytes, res.content)
        if not content_type.output.is_text:
            return f"[Binary Data: {content_type.output.label}]"
        elif content_type.output.label == ContentTypeLabel.HTML and not raw:
            extracted = await asyncio.to_thread(trafilatura.extract, res.text, output_format="markdown")
            if extracted is not None: return extracted
            return f"<!-- trafilatura failed to extract content -->\n\n{res.text}"
        else: return res.text

    def _format_redirects(self, redirects: list[httpx.Response]) -> ET.Element:
        redirects_el = ET.Element("redirects")
        for r in redirects:
            ET.SubElement(redirects_el, "redirect", attrib={
                "status_code": str(r.status_code),
                "reason_phrase": r.reason_phrase,
                "location": r.headers.get("location", ""),
            })
        return redirects_el

    def _format_fetch_error(self, res: httpx.Response) -> str:
        error_root = ET.Element("error")
        ET.SubElement(error_root, "url").text = str(res.url)
        ET.SubElement(error_root, "status_code").text = str(res.status_code)
        ET.SubElement(error_root, "reason_phrase").text = res.reason_phrase
        error_root.append(self._format_redirects(res.history))
        ET.SubElement(error_root, "text").text = res.text
        return ET.tostring(error_root, encoding="unicode")

    async def _format_fetch_result(self, res: httpx.Response, raw: bool) -> str:
        document_root = ET.Element("document")
        ET.SubElement(document_root, "url").text = str(res.url)
        ET.SubElement(document_root, "status_code").text = str(res.status_code)
        ET.SubElement(document_root, "reason_phrase").text = res.reason_phrase
        document_root.append(self._format_redirects(res.history))
        ET.SubElement(document_root, "document_content").text = await self._extract_fetch_content(res, raw)
        return ET.tostring(document_root, encoding="unicode")

    @built_in_tool(validate=True, defaults=BuiltInToolDefaults(auto_approve=False))
    async def fetch(self,
              url: Annotated[str, "The URL to fetch, should include the protocol (http:// or https://)."],
              method: Literal["GET", "POST", "PUT", "DELETE", "PATCH"] = "GET",
              headers: dict[str, str] | None = None,
              body: FetchBody | None = None,
              raw: Annotated[bool, "Whether to return the original response body, you can set this to True when the original HTML response is needed."] = False,
              ) -> str:
        """
        Execute HTTP/HTTPS requests to fetch web pages, interact with REST APIs, download source code, or submit data.
        Use this tool when you need to browse the internet, retrieve external documentation, read remote config files/code, or call web services.

        Content Handling:
            - General Text (Code, Configs, JSON, CSV, Plain Text): Returned directly as-is.
            - HTML Pages: By default (raw=False), HTML is intelligently extracted into clean, readable Markdown (stripping navbars, ads, and footers). If you need to parse specific DOM elements or the extraction fails, set `raw=True` to get the original HTML.
            - Binary Files: Safe to fetch. The tool will not dump binary data; instead, it identifies the file type and returns a placeholder (e.g., `[Binary Data: application/pdf]`).
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
        request_kwargs: dict[str, Any] = {"headers": {}}
        if body is not None:
            request_kwargs.update(body.to_params())
        if headers is not None:
            request_kwargs["headers"].update(headers)
        req = httpx.Request(method, url, **request_kwargs)
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            res = await client.send(req)

        if res.status_code >= 400:
            return self._format_fetch_error(res)
        return await self._format_fetch_result(res, raw)
