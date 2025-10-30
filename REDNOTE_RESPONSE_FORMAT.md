# Rednote Img Generator - n8n Response Format Handling

## 📝 n8n Webhook Response Format

### Actual Response from n8n

Based on the actual webhook response from `https://n8n.wendealai.com/webhook/rednoteimg`:

````json
[
  {
    "output": "```html\n<!DOCTYPE html>\n<html>...</html>\n```"
  }
]
````

### Response Structure

````typescript
type N8nResponse = Array<{
  output: string; // HTML code wrapped in ```html...``` markers
}>;
````

## 🔄 Processing Logic

### Step 1: Detect Response Format

The code now handles **three possible formats**:

#### Format 1: Array with output field (n8n actual format)

````json
[
  {
    "output": "```html\n<!DOCTYPE html>...</html>\n```"
  }
]
````

#### Format 2: Direct html field (fallback)

```json
{
  "html": "<!DOCTYPE html>...</html>"
}
```

#### Format 3: Direct output field (fallback)

````json
{
  "output": "```html\n<!DOCTYPE html>...</html>\n```"
}
````

### Step 2: Extract HTML Content

````typescript
let htmlContent = '';

// Check if array format
if (Array.isArray(data) && data.length > 0) {
  const output = data[0]?.output;
  if (output) {
    // Remove ```html markers
    htmlContent = output
      .replace(/^```html\n?/i, '') // Remove opening ```html
      .replace(/\n?```$/i, '') // Remove closing ```
      .trim();
  }
}
````

### Step 3: Clean Markdown Code Block Markers

The HTML is wrapped in markdown code block markers:

- Opening: ` ```html\n `
- Closing: ` \n``` `

These are removed using regex:

````typescript
.replace(/^```html\n?/i, '')  // Case-insensitive, optional newline
.replace(/\n?```$/i, '')       // Optional newline before closing
.trim()                        // Remove extra whitespace
````

## 🔍 Debugging

### Console Logs

When generating, check browser console for:

```
n8n response data: [...]
Is array? true
Processing array format, first item: {...}
Found output field, length: 5234
Extracted HTML, length: 5210
Successfully extracted HTML content
```

### Common Issues

#### Issue 1: HTML Not Displaying

**Symptom**: Empty output area
**Check**: Console for "Failed to extract HTML content"
**Solution**: Verify response format matches expected structure

#### Issue 2: Markdown Markers Visible

**Symptom**: Seeing ` ```html ` in output
**Check**: Regex replacement not working
**Solution**: Ensure regex patterns are correct

#### Issue 3: Parse Error

**Symptom**: "HTML content not found in response"
**Check**: Response structure
**Solution**: Add additional format handling

## 📊 Response Example

### Input

````json
[
  {
    "output": "```html\n<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>...</head>\n<body>...</body>\n</html>\n```"
  }
]
````

### Processing Steps

1. **Detect**: `Array.isArray(data)` → `true`
2. **Extract**: `data[0].output` → `"```html\n<!DOCTYPE...```"`
3. **Clean**: Remove markers → `"<!DOCTYPE html>..."`
4. **Display**: Set `generatedHtml` state

### Final Output

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    ...
  </head>
  <body>
    ...
  </body>
</html>
```

## 🎯 Code Flow

````
User clicks Generate
    ↓
Send POST to webhook
    ↓
Receive response (array format)
    ↓
Check if Array.isArray(data)
    ↓
Extract data[0].output
    ↓
Remove ```html markers
    ↓
Set generatedHtml state
    ↓
Display in preview & code areas
````

## ✅ Supported Formats Summary

| Format        | Structure                     | Handled     |
| ------------- | ----------------------------- | ----------- |
| n8n Array     | `[{output: "```html...```"}]` | ✅ Primary  |
| Direct HTML   | `{html: "<!DOCTYPE..."}`      | ✅ Fallback |
| Direct Output | `{output: "```html...```"}`   | ✅ Fallback |

## 🔧 Regex Patterns Explained

### Remove Opening Marker

````typescript
.replace(/^```html\n?/i, '')
````

- `^` - Start of string
- ` ```html ` - Literal text
- `\n?` - Optional newline
- `i` - Case insensitive

### Remove Closing Marker

````typescript
.replace(/\n?```$/i, '')
````

- `\n?` - Optional newline
- ` ``` ` - Literal text
- `$` - End of string
- `i` - Case insensitive

## 🎨 Example HTML Output

The extracted HTML is a complete Rednote-style card:

- **Width**: 1080px
- **Height**: 1440px
- **Style**: 小红书 (Xiaohongshu/Rednote) format
- **Font**: PingFang SC, Microsoft YaHei
- **Layout**: Card-based with emoji bullets

## 📝 Testing

### Test Case 1: Normal Response

````javascript
Input: [{output: "```html\n<html>test</html>\n```"}]
Expected: "<html>test</html>"
Result: ✅ Pass
````

### Test Case 2: No Newlines

````javascript
Input: [{output: "```html<html>test</html>```"}]
Expected: "<html>test</html>"
Result: ✅ Pass
````

### Test Case 3: Extra Whitespace

````javascript
Input: [{output: "```html\n  <html>test</html>  \n```"}]
Expected: "<html>test</html>"
Result: ✅ Pass (trim() removes extra spaces)
````

## 🚀 Usage

Simply input your content and click Generate:

1. Text is sent to `https://n8n.wendealai.com/webhook/rednoteimg`
2. n8n returns formatted HTML in array format
3. Component extracts and cleans HTML
4. HTML is displayed in preview area
5. User can copy or open in new window

## 🔗 Related Files

- **Component**: `src/pages/SocialMedia/components/RednoteImgGenerator.tsx`
- **Types**: `src/pages/SocialMedia/types.ts`
- **Styles**: `src/pages/SocialMedia/components/RednoteImgGenerator.css`

---

**Status**: ✅ Implemented and tested with actual n8n response format
