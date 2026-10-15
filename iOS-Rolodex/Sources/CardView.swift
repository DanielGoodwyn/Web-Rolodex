import SwiftUI

struct CardView: View {
    let card: Association
    let number: Int
    let allAssociateNames: [String]
    let allParentNames: [String]
    let notes: [Note]
    let onDeleteCard: (Association) -> Void
    let onAddAssociate: (Association, String) -> Void
    let onUnlinkAssociate: (Association, String) -> Void
    let onAddNote: (Association, String) -> Void
    let onDeleteNote: (Note) -> Void
    let onSearch: (String) -> Void

    @State private var isExpanded: Bool = true
    @State private var newAssociateText = ""
    @State private var newNoteText = ""
    @State private var showDeleteAlert = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header Row: Expand Chevron + Number + Name + Rating Badge + Delete
            Button(action: {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            }) {
                HStack(spacing: 8) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption.bold())
                        .foregroundColor(.secondary)

                    Text(String(format: "%02d", number))
                        .font(.subheadline.bold())
                        .foregroundColor(.secondary)

                    Text(card.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    Spacer()

                    if !card.isAssociate {
                        if card.displayRating > 0 {
                            Text("\(card.displayRating)")
                                .font(.caption.bold())
                                .foregroundColor(.black)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Theme.ratingColor(for: card.displayRating))
                                .cornerRadius(4)
                        } else {
                            Text("-")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color(uiColor: .systemGray5))
                                .cornerRadius(4)
                        }
                    }

                    Button(action: { showDeleteAlert = true }) {
                        Image(systemName: "xmark")
                            .font(.subheadline.bold())
                            .foregroundColor(.red)
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
                                    Label("Google Maps", systemImage: "map")
                                        .font(.caption.bold())
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Theme.googleMapsBlue.opacity(0.12))
                                        .foregroundColor(Theme.googleMapsBlue)
                                        .cornerRadius(6)
                                }

                                Button(action: { openAppleMaps(for: loc) }) {
                                    Label("Apple Maps", systemImage: "location.north.line")
                                        .font(.caption.bold())
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Color.secondary.opacity(0.12))
                                        .foregroundColor(.primary)
                                        .cornerRadius(6)
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

                    // Links (Web, FB, Insta, X)
                    let links = [
                        card.websiteUrl.map { (title: "Web", url: $0, color: Theme.primary) },
                        card.facebookUrl.map { (title: "Facebook", url: $0, color: Theme.facebookBlue) },
                        card.instagramUrl.map { (title: "Insta", url: $0, color: Theme.instagramPink) },
                        card.twitterUrl.map { (title: "X", url: $0, color: Theme.xBlack) }
                    ].compactMap { $0 }

                    if !links.isEmpty {
                        HStack(spacing: 8) {
                            ForEach(links, id: \.title) { item in
                                Link(destination: URL(string: formatUrl(item.url)) ?? URL(string: "https://danielgoodwyn.com")!) {
                                    Text(item.title)
                                        .font(.caption.bold())
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 4)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(item.color.opacity(0.6), lineWidth: 1)
                                        )
                                        .foregroundColor(item.color)
                                }
                            }
                        }
                    }

                    // Associates Section
                    VStack(alignment: .leading, spacing: 8) {
                        Text(card.isAssociate ? "Associated With" : "Associates")
                            .font(.caption.bold())
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
                                            Image(systemName: "xmark.circle.fill")
                                                .font(.caption2)
                                                .foregroundColor(.secondary)
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
                                Image(systemName: "plus.circle.fill")
                                    .foregroundColor(Theme.primary)
                                    .font(.title3)
                            }
                        }
                    }

                    // Notes Section
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Notes")
                            .font(.caption.bold())
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
    }

    private func formatUrl(_ raw: String) -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.hasPrefix("http://") && !trimmed.hasPrefix("https://") {
            return "https://\(trimmed)"
        }
        return trimmed
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
