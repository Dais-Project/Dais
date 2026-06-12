import base64
import xml.etree.ElementTree as ET

import httpx
import pytest
import src.agent.tool.builtin_tools.web_interaction as web_interaction_module
from dais_sdk.types import AudioBlock, ImageBlock, TextBlock, VideoBlock
from magika.types.content_type_label import ContentTypeLabel
from src.agent.tool.builtin_tools.web_interaction import (
    MAX_MEDIA_CONTENT_BLOCK_BYTES,
    WebInteractionToolset,
)


class FakeContentTypeOutput:
    def __init__(self, group: str, mime_type: str, is_text: bool, label):
        self.group = group
        self.mime_type = mime_type
        self.is_text = is_text
        self.label = label


class FakeContentType:
    def __init__(self, output: FakeContentTypeOutput):
        self.output = output


class FakeMagika:
    def __init__(self, output: FakeContentTypeOutput):
        self._output = output

    def identify_bytes(self, _: bytes) -> FakeContentType:
        return FakeContentType(self._output)


class FakeAsyncClient:
    def __init__(self, response: httpx.Response):
        self._response = response

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def send(self, _: httpx.Request) -> httpx.Response:
        return self._response


def make_response(
    content: bytes,
    status_code: int = 200,
    content_type: str = "application/octet-stream",
) -> httpx.Response:
    request = httpx.Request("GET", "https://example.com/resource")
    return httpx.Response(
        status_code,
        content=content,
        request=request,
        headers={"content-type": content_type},
    )


@pytest.mark.tool
class TestFetch:
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        ("group", "mime_type", "expected_block_type"),
        [
            ("image", "image/png", ImageBlock),
            ("audio", "audio/mpeg", AudioBlock),
            ("video", "video/mp4", VideoBlock),
        ],
    )
    async def test_fetch_media_response_returns_content_block(
        self,
        builtin_toolset_context,
        monkeypatch: pytest.MonkeyPatch,
        group: str,
        mime_type: str,
        expected_block_type: type[ImageBlock | AudioBlock | VideoBlock],
    ):
        content = b"fake media"
        response = make_response(content, content_type=mime_type)
        monkeypatch.setattr(
            web_interaction_module.httpx,
            "AsyncClient",
            lambda **_: FakeAsyncClient(response),
        )

        tool = WebInteractionToolset(builtin_toolset_context)
        tool._magika = FakeMagika(
            FakeContentTypeOutput(
                group=group,
                mime_type=mime_type,
                is_text=False,
                label=mime_type,
            ),
        )

        result = await tool.fetch("https://example.com/resource")

        assert isinstance(result, list)
        assert len(result) == 2
        metadata_block = result[0]
        assert isinstance(metadata_block, TextBlock)
        metadata = ET.fromstring(metadata_block.text)
        assert metadata.tag == "fetch"
        assert metadata.findtext("url") == "https://example.com/resource"
        assert metadata.findtext("status_code") == "200"
        assert metadata.findtext("reason_phrase") == "OK"
        block = result[1]
        assert isinstance(block, expected_block_type)
        assert block.source.type == "base64"
        assert block.source.mime_type == mime_type
        assert block.source.data == base64.b64encode(content).decode("ascii")

    @pytest.mark.asyncio
    async def test_fetch_media_response_rejects_oversized_content_block(
        self,
        builtin_toolset_context,
        monkeypatch: pytest.MonkeyPatch,
    ):
        response = make_response(
            b"0" * (MAX_MEDIA_CONTENT_BLOCK_BYTES + 1),
            content_type="image/png",
        )
        monkeypatch.setattr(
            web_interaction_module.httpx,
            "AsyncClient",
            lambda **_: FakeAsyncClient(response),
        )

        tool = WebInteractionToolset(builtin_toolset_context)
        tool._magika = FakeMagika(
            FakeContentTypeOutput(
                group="image",
                mime_type="image/png",
                is_text=False,
                label="image/png",
            ),
        )

        with pytest.raises(ValueError, match="too large to return as a ContentBlock"):
            await tool.fetch("https://example.com/resource")

    @pytest.mark.asyncio
    async def test_fetch_media_bytes_returns_content_block_when_detected_media(
        self,
        builtin_toolset_context,
        monkeypatch: pytest.MonkeyPatch,
    ):
        content = b"fake image"
        response = make_response(content, content_type="text/plain")
        monkeypatch.setattr(
            web_interaction_module.httpx,
            "AsyncClient",
            lambda **_: FakeAsyncClient(response),
        )

        tool = WebInteractionToolset(builtin_toolset_context)
        tool._magika = FakeMagika(
            FakeContentTypeOutput(
                group="image",
                mime_type="image/png",
                is_text=False,
                label="image/png",
            ),
        )

        result = await tool.fetch("https://example.com/resource")

        assert isinstance(result, list)
        assert len(result) == 2
        metadata_block = result[0]
        assert isinstance(metadata_block, TextBlock)
        metadata = ET.fromstring(metadata_block.text)
        assert metadata.tag == "fetch"
        assert metadata.findtext("url") == "https://example.com/resource"
        assert metadata.findtext("status_code") == "200"
        assert metadata.findtext("reason_phrase") == "OK"
        block = result[1]
        assert isinstance(block, ImageBlock)
        assert block.source.type == "base64"
        assert block.source.mime_type == "image/png"
        assert block.source.data == base64.b64encode(content).decode("ascii")

    @pytest.mark.asyncio
    async def test_fetch_text_response_returns_fetch_xml(
        self,
        builtin_toolset_context,
        monkeypatch: pytest.MonkeyPatch,
    ):
        response = make_response(b"hello")
        monkeypatch.setattr(
            web_interaction_module.httpx,
            "AsyncClient",
            lambda **_: FakeAsyncClient(response),
        )

        tool = WebInteractionToolset(builtin_toolset_context)
        tool._magika = FakeMagika(
            FakeContentTypeOutput(
                group="text",
                mime_type="text/plain",
                is_text=True,
                label="txt",
            ),
        )

        result = await tool.fetch("https://example.com/resource")

        assert isinstance(result, ET.Element)
        assert result.tag == "fetch"
        assert result.findtext("document_content") == "hello"

    @pytest.mark.asyncio
    async def test_fetch_html_raw_false_trafilatura_success(
        self,
        builtin_toolset_context,
        monkeypatch: pytest.MonkeyPatch,
    ):
        html_content = (
            b"<html><body><p>"
            + b"Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 20
            + b"</p></body></html>"
        )
        response = make_response(html_content, content_type="text/html")
        monkeypatch.setattr(
            web_interaction_module.httpx,
            "AsyncClient",
            lambda **_: FakeAsyncClient(response),
        )

        tool = WebInteractionToolset(builtin_toolset_context)
        tool._magika = FakeMagika(
            FakeContentTypeOutput(
                group="text",
                mime_type="text/html",
                is_text=True,
                label=ContentTypeLabel.HTML,
            ),
        )

        result = await tool.fetch("https://example.com/page", raw=False)

        assert isinstance(result, ET.Element)
        assert result.tag == "fetch"
        doc_content = result.findtext("document_content")
        assert doc_content is not None
        assert "Lorem ipsum" in doc_content

    @pytest.mark.asyncio
    async def test_fetch_html_raw_false_trafilatura_returns_none(
        self,
        builtin_toolset_context,
        monkeypatch: pytest.MonkeyPatch,
    ):
        html_content = b"<html><body></body></html>"
        response = make_response(html_content, content_type="text/html")
        monkeypatch.setattr(
            web_interaction_module.httpx,
            "AsyncClient",
            lambda **_: FakeAsyncClient(response),
        )

        tool = WebInteractionToolset(builtin_toolset_context)
        tool._magika = FakeMagika(
            FakeContentTypeOutput(
                group="text",
                mime_type="text/html",
                is_text=True,
                label=ContentTypeLabel.HTML,
            ),
        )

        result = await tool.fetch("https://example.com/page", raw=False)

        assert isinstance(result, ET.Element)
        assert result.tag == "fetch"
        doc_content = result.findtext("document_content")
        assert doc_content is not None
        assert "<!-- trafilatura failed to extract content -->" in doc_content

    @pytest.mark.asyncio
    async def test_fetch_html_raw_true_returns_raw_html(
        self,
        builtin_toolset_context,
        monkeypatch: pytest.MonkeyPatch,
    ):
        html_content = b"<html><body><p>Raw HTML</p></body></html>"
        response = make_response(html_content, content_type="text/html")
        monkeypatch.setattr(
            web_interaction_module.httpx,
            "AsyncClient",
            lambda **_: FakeAsyncClient(response),
        )

        tool = WebInteractionToolset(builtin_toolset_context)
        tool._magika = FakeMagika(
            FakeContentTypeOutput(
                group="text",
                mime_type="text/html",
                is_text=True,
                label=ContentTypeLabel.HTML,
            ),
        )

        result = await tool.fetch("https://example.com/page", raw=True)

        assert isinstance(result, ET.Element)
        assert result.tag == "fetch"
        assert result.findtext("document_content") == "<html><body><p>Raw HTML</p></body></html>"
