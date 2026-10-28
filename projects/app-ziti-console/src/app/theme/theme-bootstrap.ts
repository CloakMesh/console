/**
 * CloakMesh 主题引导
 *
 * ZAC 自带的「设置 → Dark mode」开关只是把 localStorage.mode 写成 dark/light 再刷新页面，
 * 刷新后由 app.component 决定是否加载 assets/styles/dark.css。
 * 这里在应用启动最早期把同一个 mode 映射成 <html data-theme="dark|light">，
 * 让我们自己的主题令牌（cloakmesh-theme.css）跟随这个既有开关，
 * 因此无需改动设置页 UI，也不需要新增开关。
 */
export function applyStoredTheme(): void {
    let mode: string | null = null;
    try {
        mode = localStorage.getItem('mode');
    } catch {
        mode = null;
    }
    const theme = mode === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
}
