const fs = require('fs');
const path = require('path');
const marked = require('marked');

const inputDir = path.join(__dirname, '..', '.gemini', 'antigravity', 'brain', '403beb2a-c289-42db-b443-bfe2609a801d');
const outputDir = __dirname;

const css = `
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
h1, h2, h3 { color: #111; margin-top: 1.5em; }
code { background: #f4f4f4; padding: 2px 5px; borderRadius: 3px; }
pre { background: #f4f4f4; padding: 15px; overflow-x: auto; borderRadius: 5px; }
table { border-collapse: collapse; width: 100%; margin: 20px 0; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; }
a { color: #0366d6; text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; border: 1px solid #ddd; borderRadius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.nav { margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
</style>
`;

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

// Ensure marked is available - simple workaround if not installed: simplistic regex parser or try require
// Since we can't easily npm install here without user permission, let's use a very simple regex-based MD parser if marked fails, or assume environment has node.

// Actually, I'll write a simple regex parser to be safe and avoided dependency issues.
function simpleMarkdown(md) {
    let html = md;
    
    // Headers
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Lists
    html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
    // Wrap lists (very simple, might not be perfect nested)
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Tables (Simple pipe tables)
    // This is hard with regex, handled basically:
    // Convert rows to tr/td
    
    // Newlines to br? No, markdown logic.
    // Paragraphs: double newline
    html = html.replace(/\n\n/g, '<p>');
    
    return html;
}

// Try to use a better parser if I can't install marked. 
// Step 1: Read files
fs.readdir(inputDir, (err, files) => {
    if (err) {
        console.error("Could not list directory.", err);
        process.exit(1);
    }

    files.forEach(file => {
        if (path.extname(file) === '.md' && file.includes('report')) {
            const content = fs.readFileSync(path.join(inputDir, file), 'utf8');
            let htmlContent = simpleMarkdown(content);
            
            // Refine table parsing if needed or leave as is. 
            // Since the user wants "like resolved", simple regex might be too weak.
            // Let's rely on the PowerShell `ConvertTo-Html` output I already generated? 
            // No, that was bad.
            
            // Let's try to improve the simple parser for tables specifically since reports use them.
            // Find table blocks
            htmlContent = htmlContent.replace(/\|(.+)\|\n\|([-:| ]+)\|\n((?:\|.*\|\n)+)/g, (match, header, separator, body) => {
                const headers = header.split('|').filter(s => s.trim()).map(s => `<th>${s.trim()}</th>`).join('');
                const rows = body.trim().split('\n').map(row => {
                    const cells = row.split('|').filter(s => s.trim()).map(s => `<td>${s.trim()}</td>`).join('');
                    return `<tr>${cells}</tr>`;
                }).join('');
                return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
            });

            const finalHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${file.replace('.md', '')}</title>
${css}
</head>
<body>
<div class="nav"><a href="index.html">Back to Index</a></div>
${htmlContent}
</body>
</html>`;

            fs.writeFileSync(path.join(outputDir, file.replace('.md', '.html')), finalHtml);
            console.log(`Converted ${file}`);
        }
    });
});
