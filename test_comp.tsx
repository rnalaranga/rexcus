export const Test = () => {
    const bom = { autoCollapsed: true }
    return <div className={`overflow-x-auto transition-all ${bom.autoCollapsed ? "hidden" : "block"}`}></div>
}