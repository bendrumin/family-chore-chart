import SwiftUI

/// Settings > Family > Export & Print. Printables are free for every family;
/// the family report and the spreadsheet are Premium, same as on the web.
struct ExportView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var templateStyle: FamilyExport.TemplateStyle = .stars
    @State private var shared: SharedFile?
    @State private var exportFailed = false

    private struct SharedFile: Identifiable {
        let url: URL
        var id: URL { url }
    }

    var body: some View {
        Form {
            if manager.children.isEmpty {
                Section {
                    Text("Add a child first. Their chores fill in the charts and reports.")
                        .foregroundColor(.choreStarTextSecondary)
                }
            } else {
                Section {
                    exportRow("Printable Chore Chart", icon: "checklist", tint: .choreStarPrimary) {
                        let snapshot = manager.exportSnapshot()
                        return try FamilyExport.write(
                            FamilyExport.choreChartPDF(snapshot),
                            named: FamilyExport.fileName("chart-family", date: snapshot.weekStart, ext: "pdf")
                        )
                    }

                    Picker("Template Style", selection: $templateStyle) {
                        ForEach(FamilyExport.TemplateStyle.allCases) { style in
                            Text(style.label).tag(style)
                        }
                    }

                    exportRow("Weekly Template", icon: "star.square.on.square", tint: .choreStarAccent) {
                        let snapshot = manager.exportSnapshot()
                        return try FamilyExport.write(
                            FamilyExport.weeklyTemplatePDF(snapshot, style: templateStyle),
                            named: FamilyExport.fileName("\(templateStyle.rawValue)-family", date: snapshot.weekStart, ext: "pdf")
                        )
                    }
                } header: {
                    Text("Printables")
                } footer: {
                    Text("A page for the fridge with a box for every chore on the days it's due. Free for every family.")
                }

                Section {
                    if manager.canUse(.export) {
                        exportRow("Family Report (PDF)", icon: "doc.richtext", tint: .choreStarPurple) {
                            try FamilyExport.write(
                                FamilyExport.familyReportPDF(manager.exportSnapshot()),
                                named: FamilyExport.fileName("family", date: FamilyExport.todayString, ext: "pdf")
                            )
                        }
                        exportRow("Spreadsheet (CSV)", icon: "tablecells", tint: .choreStarSuccess) {
                            try FamilyExport.write(
                                Data(FamilyExport.csv(manager.exportSnapshot()).utf8),
                                named: FamilyExport.fileName("family", date: FamilyExport.todayString, ext: "csv")
                            )
                        }
                    } else {
                        PremiumFeatureGate(feature: .export)
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                    }
                } header: {
                    Text("Reports")
                } footer: {
                    if manager.canUse(.export) {
                        Text("This week's completions, perfect days and earnings for each child.")
                    }
                }
            }
        }
        .navigationTitle("Export & Print")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $shared) { file in
            ShareSheet(items: [file.url])
                .presentationDetents([.medium, .large])
        }
        .alert("Couldn't create the file. Please try again.", isPresented: $exportFailed) {
            Button("OK", role: .cancel) {}
        }
    }

    private func exportRow(_ title: LocalizedStringKey, icon: String, tint: Color,
                           make: @escaping () throws -> URL) -> some View {
        Button {
            do {
                shared = SharedFile(url: try make())
            } catch {
                exportFailed = true
            }
        } label: {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(tint)
                    .frame(width: 24)
                    .accessibilityHidden(true)
                Text(title)
                    .foregroundColor(.choreStarTextPrimary)
                Spacer()
                Image(systemName: "square.and.arrow.up")
                    .foregroundColor(.choreStarTextSecondary)
                    .accessibilityHidden(true)
            }
        }
    }
}

/// The system share sheet: Print, Save to Files, Mail, AirDrop.
private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
