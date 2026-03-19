import json
import xml.etree.ElementTree as ET
from dais_sdk.types import Message

def format_context(context: list[Message]) -> list[ET.Element]:
    elements = []
    for msg in context:
        match msg.role:
            case "user":
                msg_elem = ET.Element("message", role="user")
                ET.SubElement(msg_elem, "content").text = msg.content
                elements.append(msg_elem)
            case "assistant":
                msg_elem = ET.Element("message", role="assistant")
                ET.SubElement(msg_elem, "content").text = msg.content
                if msg.tool_calls is not None:
                    tool_calls_elem = ET.SubElement(msg_elem, "tool_calls")
                    for tool_call in msg.tool_calls:
                        tool_call_elem = ET.SubElement(tool_calls_elem, "tool_call")
                        ET.SubElement(tool_call_elem, "id").text = tool_call.id
                        ET.SubElement(tool_call_elem, "name").text = tool_call.name
                        ET.SubElement(tool_call_elem, "arguments").text = json.dumps(tool_call.arguments, ensure_ascii=False)
                elements.append(msg_elem)
            case "tool":
                msg_elem = ET.Element("message", role="tool")
                ET.SubElement(msg_elem, "name").text = msg.name
                ET.SubElement(msg_elem, "arguments").text = json.dumps(msg.arguments, ensure_ascii=False)
                if msg.result is not None:
                    ET.SubElement(msg_elem, "result").text = msg.result
                if msg.error is not None:
                    ET.SubElement(msg_elem, "error").text = msg.error
                elements.append(msg_elem)
            case _: ... # do nothing for other message types
    return elements
