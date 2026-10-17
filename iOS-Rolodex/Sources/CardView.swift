import SwiftUI

struct CardView: View {
    let card: Association
    let number: Int
    @Binding var isExpanded: Bool
    let availableTypes: [String]
    let allAssociateNames: [String]
    let allParentNames: [String]
    let notes: [Note]
    let onUpdateRating: (Association, Int) -> Void
    let onUpdateCard: (Association) -> Void
    let onDeleteCard: (Association) -> Void
    let onAddAssociate: (Association, String) -> Void
    let onUnlinkAssociate: (Association, String) -> Void
    let onAddNote: (Association, String) -> Void
    let onDeleteNote: (Note) -> Void
    let onSearch: (String) -> Void
    var onUpdateLink: ((Association, String, String?) -> Void)? = nil

    @State private var newAssociateText = ""
    @State private var newNoteText = ""
    @State private var webText = ""
    @State private var fbText = ""
    @State private var igText = ""
    @State private var xText = ""
    @State private var showDeleteAlert = false
    @State private var showRatingSheet = false
    @State private var showEditSheet = false
    @State private var tempRating: Double = 50

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header Row: Expand Chevron + Number + Name + Rating Badge + Edit + Delete
            Button(action: {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            }) {
                HStack(spacing: 8) {
                    Glyph(name: isExpanded ? "chevron_up" : "chevron_down", size: 12, color: .secondary)

                    Text(String(format: "%02d", number))
                        .font(.subheadline.bold())
                        .foregroundColor(.secondary)

                    Text(card.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    Spacer()

                    if !card.isAssociate {
                        Button(action: {
                            tempRating = Double(card.displayRating > 0 ? card.displayRating : 50)
                            showRatingSheet = true
                        }) {
                            if card.displayRating > 0 {
                                Text("\(card.displayRating)")
                                    .font(.caption.bold())
                                    .foregroundColor(.black)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Theme.ratingColor(for: card.displayRating))
                                    .cornerRadius(6)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 6)
                                            .stroke(Color.white.opacity(0.35), lineWidth: 1)
                                    )
                                    .shadow(color: Theme.ratingColor(for: card.displayRating).opacity(0.3), radius: 3, x: 0, y: 1)
                            } else {
                                Text("-")
                                    .font(.caption.bold())
                                    .foregroundColor(.secondary)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color(uiColor: .systemGray5))
                                    .cornerRadius(6)
                            }
                        }
                        .buttonStyle(.plain)
                    }

                    Button(action: { showEditSheet = true }) {
                        Glyph(name: "pencil", size: 14, color: .secondary)
                            .padding(4)
                    }
                    .buttonStyle(.plain)

                    Button(action: { showDeleteAlert = true }) {
                        Glyph(name: "close", size: 14, color: .red)
                            .padding(4)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }
            .buttonStyle(.plain)

            if isExpanded {
                Divider()

                VStack(alignment: .leading, spacing: 12) {
                    // Type Badges
                    if !card.allTypes.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(card.allTypes, id: \.self) { type in
                                    Text(type)
                                        .font(.caption.bold())
                                        .foregroundColor(Theme.primaryDark)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 4)
                                        .background(Theme.primaryLight)
                                        .cornerRadius(6)
                                }
                            }
                        }
                    }

                    // Location & Directions
                    if let loc = card.location, !loc.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(loc)
                                .font(.subheadline)
                                .foregroundColor(.secondary)

                            HStack(spacing: 10) {
                                Button(action: { openGoogleMaps(for: loc) }) {
                                    HStack(spacing: 5) {
                                        Glyph(name: "maps", size: 14, color: Theme.googleMapsBlue)
                                        Text("Google Maps")
                                            .font(.caption.bold())
                                        Glyph(name: "external", size: 10, color: Theme.googleMapsBlue)
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(Theme.googleMapsBlue.opacity(0.12))
                                    .foregroundColor(Theme.googleMapsBlue)
                                    .cornerRadius(8)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(Theme.googleMapsBlue.opacity(0.35), lineWidth: 1)
                                    )
                                }

                                Button(action: { openAppleMaps(for: loc) }) {
                                    HStack(spacing: 5) {
                                        Glyph(name: "pin", size: 14, color: .primary)
                                        Text("Apple Maps")
                                            .font(.caption.bold())
                                        Glyph(name: "external", size: 10, color: .primary)
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(Color.secondary.opacity(0.12))
                                    .foregroundColor(.primary)
                                    .cornerRadius(8)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                                    )
                                }

                                Spacer()

                                let locationDetails = [
                                    card.neighborhood,
                                    card.distanceMiles.map { String(format: "%.1f mi", $0) }
                                ].compactMap { $0 }.joined(separator: " • ")

                                if !locationDetails.isEmpty {
                                    Text(locationDetails)
                                        .font(.caption.bold())
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }

                    // Links (Web, FB, Insta, X) Section
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 5) {
                            Glyph(name: "link", size: 12, color: .secondary)
                            Text("Links")
                                .font(.caption.bold())
                        }
                        .foregroundColor(.secondary)

                        // Action Buttons (Web, FB, Insta, X)
                        let activeLinks: [(title: String, glyph: String, url: String, color: Color)] = [
                            card.websiteUrl.map { (title: "Web", glyph: "globe", url: $0, color: Theme.primary) },
                            card.facebookUrl.map { (title: "FB", glyph: "facebook", url: $0, color: Theme.facebookBlue) },
                            card.instagramUrl.map { (title: "Insta", glyph: "instagram", url: $0, color: Theme.instagramPink) },
                            card.twitterUrl.map { (title: "X", glyph: "xmark", url: $0, color: Theme.xBlack) }
                        ].compactMap { $0 }

                        if !activeLinks.isEmpty {
                            HStack(spacing: 8) {
                                ForEach(activeLinks, id: \.title) { item in
                                    Button(action: { openExternalUrl(item.url) }) {
                                        HStack(spacing: 5) {
                                            Glyph(name: item.glyph, size: 13, color: item.color)
                                            Text(item.title)
                                                .font(.caption.bold())
                                            Glyph(name: "external", size: 9, color: item.color)
                                        }
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(item.color.opacity(0.12))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 8)
                                                .stroke(item.color.opacity(0.4), lineWidth: 1)
                                        )
                                        .cornerRadius(8)
                                        .foregroundColor(item.color)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        // Inline URL textboxes matching Web: www (url), fb (url), insta (url), x (url)
                        VStack(spacing: 6) {
                            HStack(spacing: 6) {
                                linkTextField(placeholder: "www (url)", text: $webText) {
                                    commitLink(type: "site", value: webText)
                                }
                                linkTextField(placeholder: "fb (url)", text: $fbText) {
                                    commitLink(type: "fb", value: fbText)
                                }
                            }
                            HStack(spacing: 6) {
                                linkTextField(placeholder: "insta (url)", text: $igText) {
                                    commitLink(type: "ig", value: igText)
                                }
                                linkTextField(placeholder: "x (url)", text: $xText) {
                                    commitLink(type: "twitter", value: xText)
                                }
                            }
                        }
                    }

                    // Associates Section
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 5) {
                            Glyph(name: card.isAssociate ? "briefcase" : "user", size: 12, color: .secondary)
                            Text(card.isAssociate ? "Associated With" : "Associates")
                                .font(.caption.bold())
                        }
                        .foregroundColor(.secondary)

                        let items = card.isAssociate ? card.linkedParentNames : card.linkedAssociateNames
                        if !items.isEmpty {
                            FlowLayout(spacing: 6) {
                                ForEach(items, id: \.id) { item in
                                    HStack(spacing: 4) {
                                        Text(item.name)
                                            .font(.caption)
                                            .foregroundColor(.primary)
                                            .onTapGesture { onSearch(item.name) }

                                        Button(action: { onUnlinkAssociate(card, item.id) }) {
                                            Glyph(name: "close", size: 10, color: .secondary)
                                        }
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color(uiColor: .systemGray5))
                                    .cornerRadius(12)
                                }
                            }
                        }

                        HStack {
                            TextField(card.isAssociate ? "Link organization (e.g. Philz Coffee)" : "Add associate (e.g. Daniel Goodwyn)", text: $newAssociateText)
                                .font(.caption)
                                .textFieldStyle(.roundedBorder)

                            Button(action: {
                                let trimmed = newAssociateText.trimmingCharacters(in: .whitespaces)
                                if !trimmed.isEmpty {
                                    onAddAssociate(card, trimmed)
                                    newAssociateText = ""
                                }
                            }) {
                                Glyph(name: "plus", size: 18, color: Theme.primary)
                            }
                        }
                    }

                    // Notes Section
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 5) {
                            Glyph(name: "notes", size: 12, color: .secondary)
                            Text("Notes")
                                .font(.caption.bold())
                        }
                        .foregroundColor(.secondary)

                        ForEach(notes) { note in
                            HStack(alignment: .top) {
                                Text("• \(note.displayNote)")
                                    .font(.caption)
                                    .foregroundColor(.primary)
                                Spacer()
                                Button(action: { onDeleteNote(note) }) {
                                    Image(systemName: "trash")
                                        .font(.caption2)
                                        .foregroundColor(.red)
                                }
                            }
                            .padding(.vertical, 2)
                        }

                        HStack {
                            TextField("New note...", text: $newNoteText)
                                .font(.caption)
                                .textFieldStyle(.roundedBorder)

                            Button(action: {
                                let trimmed = newNoteText.trimmingCharacters(in: .whitespaces)
                                if !trimmed.isEmpty {
                                    onAddNote(card, trimmed)
                                    newNoteText = ""
                                }
                            }) {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundColor(Theme.primary)
                                    .font(.title3)
                            }
                        }
                    }
                }
                .padding(14)
            }
        }
        .background(Theme.cardBackground)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.06), radius: 4, x: 0, y: 2)
        .padding(.horizontal, 16)
        .padding(.vertical, 4)
        .alert("Delete Card", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) {
                onDeleteCard(card)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete \(card.name)?")
        }
        .sheet(isPresented: $showRatingSheet) {
            NavigationStack {
                VStack(spacing: 24) {
                    Text(card.name)
                        .font(.headline)
                        .foregroundColor(.primary)

                    HStack(spacing: 12) {
                        Text("\(Int(tempRating))")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(.black)
                            .frame(width: 80, height: 50)
                            .background(Theme.ratingColor(for: Int(tempRating)))
                            .cornerRadius(10)
                    }

                    Slider(value: $tempRating, in: 1...100, step: 1)
                        .tint(Theme.ratingColor(for: Int(tempRating)))
                        .padding(.horizontal, 28)

                    HStack(spacing: 8) {
                        ForEach([20, 40, 60, 80, 95, 100], id: \.self) { preset in
                            Button("\(preset)") {
                                tempRating = Double(preset)
                            }
                            .font(.caption.bold())
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Theme.ratingColor(for: preset))
                            .foregroundColor(.black)
                            .cornerRadius(6)
                        }
                    }

                    Spacer()
                }
                .padding(.top, 28)
                .navigationTitle("Update Rating")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { showRatingSheet = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") {
                            onUpdateRating(card, Int(tempRating))
                            showRatingSheet = false
                        }
                        .bold()
                    }
                }
            }
            .presentationDetents([.height(290)])
        }
        .sheet(isPresented: $showEditSheet) {
            EditCardView(card: card, availableTypes: availableTypes) { updatedCard in
                onUpdateCard(updatedCard)
            }
        }
        .onAppear {
            syncLinksFromCard()
        }
        .onChange(of: card) { _ in
            syncLinksFromCard()
        }
    }

    private func syncLinksFromCard() {
        webText = card.websiteUrl ?? ""
        fbText = card.facebookUrl ?? ""
        igText = card.instagramUrl ?? ""
        xText = card.twitterUrl ?? ""
    }

    @ViewBuilder
    private func linkTextField(placeholder: String, text: Binding<String>, onCommit: @escaping () -> Void) -> some View {
        TextField(placeholder, text: text)
            .font(.system(size: 11))
            .autocapitalization(.none)
            .disableAutocorrection(true)
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(Color(uiColor: .systemGray6))
            .cornerRadius(6)
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
            )
            .onSubmit(onCommit)
    }

    private func commitLink(type: String, value: String) {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        onUpdateLink?(card, type, trimmed.isEmpty ? nil : trimmed)
    }

    private func openExternalUrl(_ raw: String) {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        var full = trimmed
        if !full.lowercased().hasPrefix("http://") && !full.lowercased().hasPrefix("https://") {
            full = "https://\(full)"
        }
        guard let encoded = full.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed.union(.init(charactersIn: ":/?#[]@!$&'()*+,;="))),
              let url = URL(string: encoded) else {
            return
        }
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }

    private func openGoogleMaps(for address: String) {
        if let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
           let url = URL(string: "https://www.google.com/maps/search/?api=1&query=\(encoded)") {
            UIApplication.shared.open(url)
        }
    }

    private func openAppleMaps(for address: String) {
        if let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
           let url = URL(string: "http://maps.apple.com/?q=\(encoded)") {
            UIApplication.shared.open(url)
        }
    }
}

// Simple FlowLayout for chips in SwiftUI
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        var height: CGFloat = 0
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0

        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if currentX + size.width > width && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
        }
        height = currentY + lineHeight
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var currentX = bounds.minX
        var currentY = bounds.minY
        var lineHeight: CGFloat = 0

        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if currentX + size.width > bounds.maxX && currentX > bounds.minX {
                currentX = bounds.minX
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            view.place(at: CGPoint(x: currentX, y: currentY), proposal: .unspecified)
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
        }
    }
}
