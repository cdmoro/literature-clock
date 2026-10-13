using System;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Threading;
using Forms = System.Windows.Forms;

namespace LiteratureClock;

public static class Program
{
    [STAThread]
    public static int Main(string[] args)
    {
        try
        {
            if (args.Length > 0 && args[0] == "--check") return Checks.Run();
            var app = new Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
            var data = new Catalogues();
            var p = Preferences.Load();
            var command = args.Length == 0 ? "/c" : args[0].ToLowerInvariant();
            if (command.StartsWith("/c") || command.StartsWith("-c"))
            {
                var settings = new SettingsWindow(data, p);
                settings.Closed += (_, _) => app.Shutdown();
                settings.Show();
            }
            else if (command.StartsWith("/p") || command.StartsWith("-p"))
            {
                var value = command.Length > 2 ? command[2..].TrimStart(':') : args.Length > 1 ? args[1] : "";
                if (!long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id) || id == 0 || !Native.IsWindow((nint)id)) return 1;
                var window = new SaverWindow(data, p, 0, false, true);
                window.Show();
                var handle = new WindowInteropHelper(window).Handle;
                Native.SetWindowLongPtr(handle, -16, (nint)0x50000000); // WS_CHILD | WS_VISIBLE
                Native.SetParent(handle, (nint)id);
                var poll = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(250) };
                poll.Tick += (_, _) =>
                {
                    if (!Native.IsWindow((nint)id)) { poll.Stop(); app.Shutdown(); return; }
                    Native.GetClientRect((nint)id, out var rect);
                    Native.SetWindowPos(handle, 0, 0, 0, rect.Right, rect.Bottom, 0x14);
                };
                poll.Start();
                Native.GetClientRect((nint)id, out var initial);
                Native.SetWindowPos(handle, 0, 0, 0, initial.Right, initial.Bottom, 0x14);
            }
            else if (command is "/s" or "-s")
            {
                var index = 0;
                foreach (var screen in Forms.Screen.AllScreens)
                {
                    var window = new SaverWindow(data, p, index++, true, false);
                    window.Show();
                    var rect = screen.Bounds;
                    Native.SetWindowPos(new WindowInteropHelper(window).Handle, -1, rect.X, rect.Y, rect.Width, rect.Height, 0x40);
                }
            }
            else if (command == "--preview")
            {
                var window = new SaverWindow(data, p, 0, false, false);
                window.Closed += (_, _) => app.Shutdown();
                window.Show();
            }
            else return 1;
            app.Run();
            return 0;
        }
        catch (Exception e)
        {
            System.Diagnostics.Trace.WriteLine(e);
            if (args.Length > 0 && args[0] == "--check")
            {
                System.IO.File.WriteAllText(System.IO.Path.Combine(System.IO.Path.GetTempPath(),"literature-clock-check-error.txt"),e.ToString());
                return 1;
            }
            // A broken payload must produce an actionable error, including in Settings.
            MessageBox.Show("Literature Clock could not load its resources. Reinstall the complete package.\n\n" + e.Message, "Literature Clock", MessageBoxButton.OK, MessageBoxImage.Error);
            return 1;
        }
    }
}
internal static class Native
{
    [StructLayout(LayoutKind.Sequential)] internal struct Rect { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] internal static extern bool IsWindow(nint handle);
    [DllImport("user32.dll")] internal static extern nint SetParent(nint child, nint parent);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")] internal static extern nint SetWindowLongPtr(nint handle, int index, nint value);
    [DllImport("user32.dll")] internal static extern bool GetClientRect(nint handle, out Rect rect);
    [DllImport("user32.dll")] internal static extern bool SetWindowPos(nint handle, nint after, int x, int y, int width, int height, uint flags);
}
public sealed class SaverWindow : Window
{
    readonly DateTime opened = DateTime.UtcNow;
    System.Drawing.Point? initialMouse;
    public SaverWindow(Catalogues data, Preferences p, int display, bool full, bool embedded)
    {
        Title = "Literature Clock"; Width = 1100; Height = 720;
        WindowStyle = full || embedded ? WindowStyle.None : WindowStyle.SingleBorderWindow;
        ResizeMode = full || embedded ? ResizeMode.NoResize : ResizeMode.CanResize;
        ShowInTaskbar = !full && !embedded; Topmost = full;
        if (full) Cursor = System.Windows.Input.Cursors.None;
        Content = new ClockSurface(data, p, display);
        if (full)
        {
            PreviewKeyDown += (_, _) => Application.Current.Shutdown();
            PreviewMouseDown += (_, _) => Application.Current.Shutdown();
            var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(100) };
            timer.Tick += (_, _) =>
            {
                var point = Forms.Cursor.Position;
                if ((DateTime.UtcNow - opened).TotalSeconds < 1) { initialMouse = point; return; }
                initialMouse ??= point;
                if (Math.Abs(point.X - initialMouse.Value.X) > 4 || Math.Abs(point.Y - initialMouse.Value.Y) > 4) Application.Current.Shutdown();
            };
            timer.Start(); Closed += (_, _) => timer.Stop();
        }
        else if (!embedded)
        {
            var currentPreferences=p;
            PreviewKeyDown += (_, e) =>
            {
                if (e.Key == System.Windows.Input.Key.F2)
                {
                    var dialog = new SettingsWindow(data, currentPreferences) { Owner = this };
                    if (dialog.ShowDialog() == true) { currentPreferences=Preferences.Load(); Content = new ClockSurface(data, currentPreferences, display); }
                }
            };
        }
    }
}
