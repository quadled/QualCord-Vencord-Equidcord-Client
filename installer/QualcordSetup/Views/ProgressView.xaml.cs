using System;
using System.Windows.Controls;

namespace CustomInstaller.Views;

public partial class ProgressView : UserControl
{
    public ProgressView()
    {
        InitializeComponent();
    }

    public void SetContext(string title, string subtitle)
    {
        TxtTitle.Text = title;
        TxtSubtitle.Text = subtitle;
    }

    public void UpdateProgress(int percent, string status)
    {
        Dispatcher.Invoke(() =>
        {
            ProgressBarMain.Value = percent;
            TxtPercent.Text = $"{percent} %";
            TxtStatus.Text = status;

            ListLog.Items.Add($"[{DateTime.Now:HH:mm:ss}] {status}");
            ListLog.ScrollIntoView(ListLog.Items[^1]);
        });
    }

    public void Log(string message)
    {
        Dispatcher.Invoke(() =>
        {
            ListLog.Items.Add($"[{DateTime.Now:HH:mm:ss}] {message}");
            if (ListLog.Items.Count > 0)
                ListLog.ScrollIntoView(ListLog.Items[^1]);
        });
    }

    public void Reset()
    {
        ProgressBarMain.Value = 0;
        TxtPercent.Text = "0 %";
        TxtStatus.Text = "Vorbereitung...";
        ListLog.Items.Clear();
    }
}
