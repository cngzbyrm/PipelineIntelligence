using ClosedXML.Excel;
using iTextSharp.text;
using iTextSharp.text.pdf;
using PdfTable = iTextSharp.text.pdf.PdfPTable;
using PdfCell = iTextSharp.text.pdf.PdfPCell;

namespace PipelineApi.Services;

public static class SonarReportService
{
    // ── Excel Raporu ──────────────────────────────────────────────────────────
    public static byte[] GenerateExcel(string project, List<SonarIssue> issues, SonarMetrics? metrics, List<SonarFileMetrics>? fileMetrics = null)
    {
        using var wb = new XLWorkbook();

        // ── Sheet 1: Özet ─────────────────────────────────────────────────────
        var summary = wb.Worksheets.Add("Özet");
        summary.Cell("A1").Value = "SonarQube Kalite Raporu";
        summary.Cell("A1").Style.Font.Bold = true;
        summary.Cell("A1").Style.Font.FontSize = 16;
        summary.Cell("A1").Style.Font.FontColor = XLColor.FromHtml("#0D9488");
        summary.Cell("A2").Value = $"Proje: {project}";
        summary.Cell("A3").Value = $"Rapor Tarihi: {DateTime.Now:dd.MM.yyyy HH:mm}";
        summary.Cell("A4").Value = $"Toplam Issue: {issues.Count}";

        if (metrics is not null)
        {
            summary.Cell("A6").Value = "Metrik"; summary.Cell("B6").Value = "Değer";
            summary.Cell("A6").Style.Font.Bold = true; summary.Cell("B6").Style.Font.Bold = true;
            summary.Cell("A6").Style.Fill.BackgroundColor = XLColor.FromHtml("#0D9488");
            summary.Cell("A6").Style.Font.FontColor = XLColor.White;
            summary.Cell("B6").Style.Fill.BackgroundColor = XLColor.FromHtml("#0D9488");
            summary.Cell("B6").Style.Font.FontColor = XLColor.White;

            var rows = new[] {
                ("Bugs",            metrics.Bugs.ToString()),
                ("Vulnerabilities", metrics.Vulnerabilities.ToString()),
                ("Code Smells",     metrics.CodeSmells.ToString()),
                ("Coverage",        $"{metrics.Coverage:F1}%"),
                ("Duplications",    $"{metrics.DuplicatedLines:F1}%"),
                ("Lines of Code",   metrics.LinesOfCode.ToString("N0")),
                ("Quality Gate",    metrics.QualityGate == "OK" ? "✅ Passed" : "❌ Failed"),
                ("Security Rating", RatingLabel(metrics.SecurityRating)),
                ("Reliability",     RatingLabel(metrics.ReliabilityRating)),
                ("Maintainability", RatingLabel(metrics.MaintainabilityRating)),
            };

            for (int i = 0; i < rows.Length; i++)
            {
                summary.Cell(7 + i, 1).Value = rows[i].Item1;
                summary.Cell(7 + i, 2).Value = rows[i].Item2;
                if (i % 2 == 0)
                {
                    summary.Cell(7 + i, 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
                    summary.Cell(7 + i, 2).Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
                }
            }
        }

        int startRow = metrics is not null ? 19 : 7;
        summary.Cell(startRow, 1).Value = "Severity"; summary.Cell(startRow, 2).Value = "Adet";
        summary.Cell(startRow, 1).Style.Font.Bold = true;
        summary.Cell(startRow, 2).Style.Font.Bold = true;
        summary.Cell(startRow, 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#1E293B");
        summary.Cell(startRow, 1).Style.Font.FontColor = XLColor.White;
        summary.Cell(startRow, 2).Style.Fill.BackgroundColor = XLColor.FromHtml("#1E293B");
        summary.Cell(startRow, 2).Style.Font.FontColor = XLColor.White;

        var severities = new[] { "BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO" };
        var sevColors = new[] { "#DC2626", "#EA580C", "#CA8A04", "#2563EB", "#64748B" };
        for (int i = 0; i < severities.Length; i++)
        {
            var count = issues.Count(x => x.Severity == severities[i]);
            summary.Cell(startRow + 1 + i, 1).Value = severities[i];
            summary.Cell(startRow + 1 + i, 2).Value = count;
            summary.Cell(startRow + 1 + i, 1).Style.Font.FontColor = XLColor.FromHtml(sevColors[i]);
            summary.Cell(startRow + 1 + i, 1).Style.Font.Bold = true;
        }
        summary.Column(1).Width = 22;
        summary.Column(2).Width = 18;

        // ── Sheet 2: Dosya Bazlı ──────────────────────────────────────────────
        var byFile = wb.Worksheets.Add("Dosya Bazlı");
        var fileGroups = issues
            .GroupBy(i => i.Component.Split(':').LastOrDefault() ?? i.Component)
            .OrderByDescending(g => g.Count()).ToList();

        byFile.Cell("A1").Value = "Dosya";
        byFile.Cell("B1").Value = "Toplam Issue";
        byFile.Cell("C1").Value = "Blocker";
        byFile.Cell("D1").Value = "Critical";
        byFile.Cell("E1").Value = "Major";
        byFile.Cell("F1").Value = "Minor";
        byFile.Cell("G1").Value = "Bug";
        byFile.Cell("H1").Value = "Vulnerability";
        byFile.Cell("I1").Value = "Code Smell";

        var hdr = byFile.Range("A1:I1");
        hdr.Style.Font.Bold = true;
        hdr.Style.Fill.BackgroundColor = XLColor.FromHtml("#0D9488");
        hdr.Style.Font.FontColor = XLColor.White;

        for (int i = 0; i < fileGroups.Count; i++)
        {
            var g = fileGroups[i];
            var row = i + 2;
            byFile.Cell(row, 1).Value = g.Key;
            byFile.Cell(row, 2).Value = g.Count();
            byFile.Cell(row, 3).Value = g.Count(x => x.Severity == "BLOCKER");
            byFile.Cell(row, 4).Value = g.Count(x => x.Severity == "CRITICAL");
            byFile.Cell(row, 5).Value = g.Count(x => x.Severity == "MAJOR");
            byFile.Cell(row, 6).Value = g.Count(x => x.Severity == "MINOR");
            byFile.Cell(row, 7).Value = g.Count(x => x.Type == "BUG");
            byFile.Cell(row, 8).Value = g.Count(x => x.Type == "VULNERABILITY");
            byFile.Cell(row, 9).Value = g.Count(x => x.Type == "CODE_SMELL");
            if (i % 2 == 0)
                byFile.Range(row, 1, row, 9).Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
        }
        byFile.Column(1).Width = 50;
        for (int c = 2; c <= 9; c++) byFile.Column(c).Width = 14;
        byFile.SheetView.FreezeRows(1);

        // ── Sheet 3: Dosya Bazlı Issue'lar (gruplu) ───────────────────────────
        var allSheet = wb.Worksheets.Add("Dosya Bazlı Issue'lar");
        allSheet.Cell("A1").Value = "Dosya / Mesaj";
        allSheet.Cell("B1").Value = "Severity";
        allSheet.Cell("C1").Value = "Tip";
        allSheet.Cell("D1").Value = "Satır";
        var hdr2 = allSheet.Range("A1:D1");
        hdr2.Style.Font.Bold = true;
        hdr2.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E293B");
        hdr2.Style.Font.FontColor = XLColor.White;
        hdr2.Style.Font.FontSize = 11;

        var fileGroups2 = issues
            .GroupBy(i => i.Component.Split(':').LastOrDefault() ?? i.Component)
            .OrderByDescending(g => g.Count()).ToList();

        int rowIdx = 2;
        foreach (var g in fileGroups2)
        {
            var fileRange = allSheet.Range(rowIdx, 1, rowIdx, 4);
            fileRange.Merge();
            fileRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#0D9488");
            fileRange.Style.Font.FontColor = XLColor.White;
            fileRange.Style.Font.Bold = true;
            fileRange.Style.Font.FontSize = 10;
            allSheet.Cell(rowIdx, 1).Value = $"📄 {g.Key}  ({g.Count()} issue)";
            rowIdx++;

            bool alt = false;
            foreach (var issue in g.OrderByDescending(x => SevOrder(x.Severity)))
            {
                var bg = alt ? XLColor.FromHtml("#F0FDFA") : XLColor.White;
                allSheet.Cell(rowIdx, 1).Value = "    " + issue.Message;
                allSheet.Cell(rowIdx, 2).Value = issue.Severity;
                allSheet.Cell(rowIdx, 3).Value = issue.Type;
                allSheet.Cell(rowIdx, 4).Value = issue.Line > 0 ? issue.Line.ToString() : "—";

                var sevColor = issue.Severity switch
                {
                    "BLOCKER" => XLColor.FromHtml("#DC2626"),
                    "CRITICAL" => XLColor.FromHtml("#EA580C"),
                    "MAJOR" => XLColor.FromHtml("#CA8A04"),
                    "MINOR" => XLColor.FromHtml("#2563EB"),
                    _ => XLColor.FromHtml("#64748B"),
                };
                allSheet.Cell(rowIdx, 2).Style.Font.FontColor = sevColor;
                allSheet.Cell(rowIdx, 2).Style.Font.Bold = true;
                allSheet.Range(rowIdx, 1, rowIdx, 4).Style.Fill.BackgroundColor = bg;
                alt = !alt;
                rowIdx++;
            }
            rowIdx++;
        }
        allSheet.Column(1).Width = 80;
        allSheet.Column(2).Width = 14;
        allSheet.Column(3).Width = 16;
        allSheet.Column(4).Width = 8;
        allSheet.SheetView.FreezeRows(1);

        // ── Sheet 4: SonarQube Kod Analizi (Lines/Coverage/Rating) ────────────
        if (fileMetrics != null && fileMetrics.Count > 0)
        {
            var cs = wb.Worksheets.Add("SonarQube Kod Analizi");

            cs.Range("A1:I1").Merge();
            cs.Cell("A1").Value = $"SonarQube Kod Analizi — {project}";
            cs.Cell("A1").Style.Font.Bold = true;
            cs.Cell("A1").Style.Font.FontSize = 13;
            cs.Cell("A1").Style.Font.FontColor = XLColor.White;
            cs.Cell("A1").Style.Fill.BackgroundColor = XLColor.FromHtml("#0F172A");
            cs.Cell("A1").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cs.Row(1).Height = 28;

            string[] chdrs = ["Dosya", "Lines", "Coverage", "Duplications", "Security", "Reliability", "Maintainability", "Hotspot", "Modül"];
            for (int i = 0; i < chdrs.Length; i++)
            {
                var c = cs.Cell(2, i + 1);
                c.Value = chdrs[i];
                c.Style.Font.Bold = true;
                c.Style.Font.FontColor = XLColor.White;
                c.Style.Fill.BackgroundColor = XLColor.FromHtml("#0D9488");
                c.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }
            cs.Row(2).Height = 18;

            static string RatingBg(string r) => r switch { "A" => "#DCFCE7", "B" => "#D9F99D", "C" => "#FEF9C3", "D" => "#FED7AA", "E" => "#FEE2E2", _ => "#F1F5F9" };
            static string RatingFg(string r) => r switch { "A" => "#16A34A", "B" => "#65A30D", "C" => "#CA8A04", "D" => "#EA580C", "E" => "#DC2626", _ => "#94A3B8" };

            var sortedFm = fileMetrics.OrderBy(f => GetModule(f.Path)).ThenByDescending(f => f.Lines).ToList();

            for (int i = 0; i < sortedFm.Count; i++)
            {
                var fm = sortedFm[i];
                var row = i + 3;
                var bg = i % 2 == 0 ? XLColor.FromHtml("#F8FAFC") : XLColor.White;

                cs.Cell(row, 1).Value = fm.Path;
                cs.Cell(row, 1).Style.Fill.BackgroundColor = bg;
                cs.Cell(row, 1).Style.Font.FontSize = 9;

                cs.Cell(row, 2).Value = fm.Lines;
                cs.Cell(row, 2).Style.Fill.BackgroundColor = bg;
                cs.Cell(row, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                cs.Cell(row, 2).Style.Font.FontSize = 9;

                cs.Cell(row, 3).Value = $"{fm.Coverage:F1}%";
                cs.Cell(row, 3).Style.Fill.BackgroundColor = bg;
                cs.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cs.Cell(row, 3).Style.Font.FontColor = fm.Coverage == 0 ? XLColor.FromHtml("#94A3B8") : XLColor.FromHtml("#16A34A");
                cs.Cell(row, 3).Style.Font.FontSize = 9;

                cs.Cell(row, 4).Value = $"{fm.Duplications:F1}%";
                cs.Cell(row, 4).Style.Fill.BackgroundColor = bg;
                cs.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cs.Cell(row, 4).Style.Font.FontColor = fm.Duplications > 10 ? XLColor.FromHtml("#DC2626") : fm.Duplications > 3 ? XLColor.FromHtml("#CA8A04") : XLColor.FromHtml("#16A34A");
                cs.Cell(row, 4).Style.Font.FontSize = 9;

                foreach (var (col, grade) in new[] { (5, fm.SecurityGrade), (6, fm.ReliabilityGrade), (7, fm.MaintainabilityGrade) })
                {
                    cs.Cell(row, col).Value = grade;
                    cs.Cell(row, col).Style.Fill.BackgroundColor = XLColor.FromHtml(RatingBg(grade));
                    cs.Cell(row, col).Style.Font.FontColor = XLColor.FromHtml(RatingFg(grade));
                    cs.Cell(row, col).Style.Font.Bold = true;
                    cs.Cell(row, col).Style.Font.FontSize = 9;
                    cs.Cell(row, col).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                }

                cs.Cell(row, 8).Value = fm.SecurityHotspots;
                cs.Cell(row, 8).Style.Fill.BackgroundColor = bg;
                cs.Cell(row, 8).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cs.Cell(row, 8).Style.Font.FontColor = fm.SecurityHotspots > 0 ? XLColor.FromHtml("#EA580C") : XLColor.FromHtml("#94A3B8");
                cs.Cell(row, 8).Style.Font.FontSize = 9;

                cs.Cell(row, 9).Value = GetModule(fm.Path);
                cs.Cell(row, 9).Style.Fill.BackgroundColor = bg;
                cs.Cell(row, 9).Style.Font.FontSize = 9;

                cs.Row(row).Height = 15;
            }

            cs.Column(1).Width = 65;
            cs.Column(2).Width = 10;
            cs.Column(3).Width = 13;
            cs.Column(4).Width = 14;
            cs.Column(5).Width = 13;
            cs.Column(6).Width = 14;
            cs.Column(7).Width = 18;
            cs.Column(8).Width = 11;
            cs.Column(9).Width = 20;
            cs.SheetView.FreezeRows(2);
            cs.RangeUsed()?.SetAutoFilter();
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // ── PDF Raporu ────────────────────────────────────────────────────────────
    public static byte[] GeneratePdf(string project, List<SonarIssue> issues, SonarMetrics? metrics)
    {
        using var ms = new MemoryStream();
        var doc = new Document(PageSize.A4, 40, 40, 60, 40);
        var writer = PdfWriter.GetInstance(doc, ms);
        doc.Open();

        var teal = new BaseColor(13, 148, 136);
        var dark = new BaseColor(30, 41, 59);
        var gray = new BaseColor(71, 85, 105);
        var lightBg = new BaseColor(248, 250, 252);
        var white = BaseColor.WHITE;
        var red = new BaseColor(220, 38, 38);
        var orange = new BaseColor(234, 88, 12);
        var yellow = new BaseColor(202, 138, 4);
        var blue = new BaseColor(37, 99, 235);
        var slategray = new BaseColor(100, 116, 139);

        var fontBold = BaseFont.CreateFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, false);
        var fontNorm = BaseFont.CreateFont(BaseFont.HELVETICA, BaseFont.CP1252, false);

        Font F(BaseFont bf, float size, BaseColor c) => new Font(bf, size, Font.NORMAL, c);

        var titleTable = new PdfTable(1) { WidthPercentage = 100 };
        titleTable.AddCell(new PdfCell(new Phrase(new Chunk("SonarQube Kalite Raporu", F(fontBold, 20, white)))) { BackgroundColor = teal, Padding = 14, Border = 0, HorizontalAlignment = Element.ALIGN_LEFT });
        doc.Add(titleTable);
        doc.Add(new Paragraph(" "));

        doc.Add(new Paragraph($"Proje: {project}", F(fontBold, 12, dark)));
        doc.Add(new Paragraph($"Rapor Tarihi: {DateTime.Now:dd.MM.yyyy HH:mm}", F(fontNorm, 10, gray)));
        doc.Add(new Paragraph($"Toplam Issue: {issues.Count}", F(fontNorm, 10, gray)));
        doc.Add(new Paragraph(" "));

        if (metrics is not null)
        {
            doc.Add(new Paragraph("Kalite Metrikleri", F(fontBold, 13, dark)));
            doc.Add(new Paragraph(" "));
            var mt = new PdfTable(2) { WidthPercentage = 60 };
            mt.SetWidths(new float[] { 60, 40 });

            void AddMRow(string label, string val, bool alt = false)
            {
                var bg = alt ? lightBg : white;
                mt.AddCell(new PdfCell(new Phrase(new Chunk(label, F(fontNorm, 10, gray)))) { BackgroundColor = bg, Padding = 6, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240) });
                mt.AddCell(new PdfCell(new Phrase(new Chunk(val, F(fontBold, 10, dark)))) { BackgroundColor = bg, Padding = 6, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240), HorizontalAlignment = Element.ALIGN_RIGHT });
            }
            AddMRow("Bugs", metrics.Bugs.ToString());
            AddMRow("Vulnerabilities", metrics.Vulnerabilities.ToString(), true);
            AddMRow("Code Smells", metrics.CodeSmells.ToString());
            AddMRow("Coverage", $"{metrics.Coverage:F1}%", true);
            AddMRow("Duplications", $"{metrics.DuplicatedLines:F1}%");
            AddMRow("Lines of Code", metrics.LinesOfCode.ToString("N0"), true);
            AddMRow("Quality Gate", metrics.QualityGate == "OK" ? "Passed" : "Failed");
            AddMRow("Security", RatingLabel(metrics.SecurityRating), true);
            AddMRow("Reliability", RatingLabel(metrics.ReliabilityRating));
            AddMRow("Maintainability", RatingLabel(metrics.MaintainabilityRating), true);
            doc.Add(mt);
            doc.Add(new Paragraph(" "));
        }

        doc.Add(new Paragraph("Severity Dağılımı", F(fontBold, 13, dark)));
        doc.Add(new Paragraph(" "));
        var st = new PdfTable(3) { WidthPercentage = 60 };
        st.SetWidths(new float[] { 40, 30, 30 });
        st.AddCell(new PdfCell(new Phrase(new Chunk("Severity", F(fontBold, 10, white)))) { BackgroundColor = dark, Padding = 6, Border = 0 });
        st.AddCell(new PdfCell(new Phrase(new Chunk("Adet", F(fontBold, 10, white)))) { BackgroundColor = dark, Padding = 6, Border = 0 });
        st.AddCell(new PdfCell(new Phrase(new Chunk("Oran", F(fontBold, 10, white)))) { BackgroundColor = dark, Padding = 6, Border = 0 });

        foreach (var (sev, color) in new (string, BaseColor)[] { ("BLOCKER", red), ("CRITICAL", orange), ("MAJOR", yellow), ("MINOR", blue), ("INFO", slategray) })
        {
            var count = issues.Count(x => x.Severity == sev);
            var pct = issues.Count > 0 ? (count * 100.0 / issues.Count) : 0;
            st.AddCell(new PdfCell(new Phrase(new Chunk(sev, F(fontBold, 9, color)))) { Padding = 5, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240) });
            st.AddCell(new PdfCell(new Phrase(new Chunk(count.ToString(), F(fontBold, 9, dark)))) { Padding = 5, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240), HorizontalAlignment = Element.ALIGN_RIGHT });
            st.AddCell(new PdfCell(new Phrase(new Chunk($"{pct:F1}%", F(fontNorm, 9, gray)))) { Padding = 5, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240), HorizontalAlignment = Element.ALIGN_RIGHT });
        }
        doc.Add(st);
        doc.Add(new Paragraph(" "));

        doc.Add(new Paragraph("En Çok Issue İçeren Dosyalar (İlk 20)", F(fontBold, 13, dark)));
        doc.Add(new Paragraph(" "));
        var ft = new PdfTable(3) { WidthPercentage = 100 };
        ft.SetWidths(new float[] { 65, 15, 20 });
        ft.AddCell(new PdfCell(new Phrase(new Chunk("Dosya", F(fontBold, 9, white)))) { BackgroundColor = dark, Padding = 6, Border = 0 });
        ft.AddCell(new PdfCell(new Phrase(new Chunk("Issue", F(fontBold, 9, white)))) { BackgroundColor = dark, Padding = 6, Border = 0 });
        ft.AddCell(new PdfCell(new Phrase(new Chunk("Blocker+Critical", F(fontBold, 9, white)))) { BackgroundColor = dark, Padding = 6, Border = 0 });

        var topFiles = issues.GroupBy(i => i.Component.Split(':').LastOrDefault() ?? i.Component)
            .OrderByDescending(g => g.Count()).Take(20).ToList();

        for (int i = 0; i < topFiles.Count; i++)
        {
            var g = topFiles[i];
            var bg = i % 2 == 0 ? lightBg : white;
            var critical = g.Count(x => x.Severity is "BLOCKER" or "CRITICAL");
            ft.AddCell(new PdfCell(new Phrase(new Chunk(g.Key, F(fontNorm, 8, dark)))) { BackgroundColor = bg, Padding = 5, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240) });
            ft.AddCell(new PdfCell(new Phrase(new Chunk(g.Count().ToString(), F(fontBold, 8, teal)))) { BackgroundColor = bg, Padding = 5, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240), HorizontalAlignment = Element.ALIGN_CENTER });
            ft.AddCell(new PdfCell(new Phrase(new Chunk(critical.ToString(), F(fontBold, 8, critical > 0 ? red : gray)))) { BackgroundColor = bg, Padding = 5, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240), HorizontalAlignment = Element.ALIGN_CENTER });
        }
        doc.Add(ft);

        // Tüm issue'lar — dosya bazlı
        if (issues.Count > 0)
        {
            doc.NewPage();
            doc.Add(new Paragraph($"Issue Listesi — Toplam {issues.Count}", F(fontBold, 13, dark)));
            doc.Add(new Paragraph(" "));
            var it = new PdfTable(4) { WidthPercentage = 100 };
            it.SetWidths(new float[] { 50, 15, 15, 20 });
            it.AddCell(new PdfCell(new Phrase(new Chunk("Mesaj", F(fontBold, 8, white)))) { BackgroundColor = dark, Padding = 5, Border = 0 });
            it.AddCell(new PdfCell(new Phrase(new Chunk("Severity", F(fontBold, 8, white)))) { BackgroundColor = dark, Padding = 5, Border = 0 });
            it.AddCell(new PdfCell(new Phrase(new Chunk("Tip", F(fontBold, 8, white)))) { BackgroundColor = dark, Padding = 5, Border = 0 });
            it.AddCell(new PdfCell(new Phrase(new Chunk("Dosya", F(fontBold, 8, white)))) { BackgroundColor = dark, Padding = 5, Border = 0 });

            var fileGroupsPdf = issues
                .GroupBy(i => i.Component.Split(':').LastOrDefault() ?? i.Component)
                .OrderByDescending(g => g.Count());

            int idx = 0;
            foreach (var g in fileGroupsPdf)
            {
                it.AddCell(new PdfCell(new Phrase(new Chunk($"  {g.Key}  ({g.Count()} issue)", F(fontBold, 8, white))))
                { BackgroundColor = teal, Padding = 5, Colspan = 4, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240) });

                foreach (var issue in g.OrderByDescending(x => SevOrder(x.Severity)))
                {
                    var bg = idx % 2 == 0 ? lightBg : white;
                    var sColor = issue.Severity switch { "BLOCKER" => red, "CRITICAL" => orange, "MAJOR" => yellow, "MINOR" => blue, _ => slategray };
                    var msg = issue.Message.Length > 80 ? issue.Message[..80] + "..." : issue.Message;
                    var file = issue.Component.Split(':').LastOrDefault() ?? issue.Component;
                    if (file.Length > 30) file = "..." + file[^27..];
                    it.AddCell(new PdfCell(new Phrase(new Chunk("  " + msg, F(fontNorm, 7, dark)))) { BackgroundColor = bg, Padding = 4, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240) });
                    it.AddCell(new PdfCell(new Phrase(new Chunk(issue.Severity, F(fontBold, 7, sColor)))) { BackgroundColor = bg, Padding = 4, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240) });
                    it.AddCell(new PdfCell(new Phrase(new Chunk(issue.Type, F(fontNorm, 7, gray)))) { BackgroundColor = bg, Padding = 4, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240) });
                    it.AddCell(new PdfCell(new Phrase(new Chunk(file, F(fontNorm, 7, gray)))) { BackgroundColor = bg, Padding = 4, Border = Rectangle.BOX, BorderColor = new BaseColor(226, 232, 240) });
                    idx++;
                }
            }
            doc.Add(it);
        }

        doc.Close();
        return ms.ToArray();
    }

    // ── Yardımcılar ───────────────────────────────────────────────────────────
    private static string RatingLabel(string r) => r switch { "1" => "A", "2" => "B", "3" => "C", "4" => "D", "5" => "E", _ => r };
    private static int SevOrder(string sev) => sev switch { "BLOCKER" => 5, "CRITICAL" => 4, "MAJOR" => 3, "MINOR" => 2, "INFO" => 1, _ => 0 };

    private static string GetModule(string path)
    {
        var p = path.ToLower();
        if (System.Text.RegularExpressions.Regex.IsMatch(p, @"/(pages/tts|ttscontroller|tts2controller|views/tts|models/tts|services/tts|facades/tts)")) return "TTS";
        if (p.Contains("partnercard")) return "PartnerCard";
        if (p.Contains("prepaid")) return "PrepaidCard";
        if (p.Contains("hgs") || p.Contains("locationrestriction")) return "HGS";
        if (p.Contains("electricvehicle") || p.Contains("evcharger")) return "EV Charger";
        if (p.Contains("carwash")) return "CarWash";
        if (p.Contains("invoice")) return "Fatura";
        if (p.Contains("provision")) return "Provizyon";
        if (p.Contains("customer") || p.Contains("account")) return "Müşteri Yönetimi";
        if (p.Contains("dashboard") || p.Contains("realtimesales") || p.Contains("audit")) return "Raporlama";
        if (p.Contains("permission") || p.Contains("sfsadmin")) return "Yetki Yönetimi";
        if (p.Contains("shellauth") || p.Contains("session") || p.Contains("login")) return "Auth/Oturum";
        return "Altyapı";
    }
}