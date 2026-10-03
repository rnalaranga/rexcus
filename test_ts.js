const ts = require('typescript');
const code = `
const component = () => {
  return (
    <div className={\`overflow-x-auto transition-all \${bom.autoCollapsed ? "hidden" : "block"}\`}></div>
  )
}
`;
try {
  ts.createSourceFile('test.tsx', code, ts.ScriptTarget.Latest, true);
  console.log("No syntax error in isolation");
} catch(e) {
  console.log("Error:", e);
}