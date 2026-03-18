use bytes::Bytes;
use futures_util::Stream;
use std::pin::Pin;

pub type ByteStream = Pin<Box<dyn Stream<Item = reqwest::Result<Bytes>> + Send>>;

/// Parse a single SSE data line and return the JSON content if valid
pub fn parse_sse_line(line: &str) -> Option<String> {
    let line = line.trim();
    if line.starts_with("data: ") {
        let data = &line["data: ".len()..];
        if data == "[DONE]" {
            return None;
        }
        Some(data.to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_sse_line_valid() {
        let line = r#"data: {"choices":[{"delta":{"content":"hello"}}]}"#;
        let result = parse_sse_line(line);
        assert!(result.is_some());
        assert!(result.unwrap().contains("hello"));
    }

    #[test]
    fn test_parse_sse_line_done() {
        let line = "data: [DONE]";
        let result = parse_sse_line(line);
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_sse_line_non_data() {
        let line = "event: message";
        let result = parse_sse_line(line);
        assert!(result.is_none());
    }
}
