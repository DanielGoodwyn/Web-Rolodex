import SwiftUI

struct EditCardView: View {
    @Environment(\.dismiss) private var dismiss
    let card: Association
    let availableTypes: [String]
    let onSave: (Association) -> Void

    @State private var name: String
    @State private var selectedTypes: Set<String>
    @State private var customTypeInput: String = ""
    @State private var rating: Double
    @State private var location: String
    @State private var web: String
    @State private var fb: String
    @State private var ig: String
    @State private var twitter: String
    @State private var isSaving: Bool = false

    init(card: Association, availableTypes: [String], onSave: @escaping (Association) -> Void) {
        self.card = card
        self.availableTypes = availableTypes
        self.onSave = onSave
        _name = State(initialValue: card.name)
        _selectedTypes = State(initialValue: Set(card.allTypes))
        _rating = State(initialValue: Double(card.displayRating > 0 ? card.displayRating : 50))
        _location = State(initialValue: card.location ?? "")
        _web = State(initialValue: card.websiteUrl ?? "")
        _fb = State(initialValue: card.facebookUrl ?? "")
        _ig = State(initialValue: card.instagramUrl ?? "")
        _twitter = State(initialValue: card.twitterUrl ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Card Details")) {
                    TextField("Name", text: $name)

                    if !card.isAssociate {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Rating: \(Int(rating))")
                                    .font(.subheadline)
                                Spacer()
                                Text("\(Int(rating))")
                                    .font(.caption.bold())
                                    .foregroundColor(.black)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Theme.ratingColor(for: Int(rating)))
                                    .cornerRadius(4)
                            }
                            Slider(value: $rating, in: 1...100, step: 1)
                        }
                    }
                }

                Section(header: Text("Categories (Multi-Select)")) {
                    let allCombinedTypes = Array(Set(availableTypes + Array(selectedTypes))).sorted()
                    if !allCombinedTypes.isEmpty {
                        FlowLayout(spacing: 6) {
                            ForEach(allCombinedTypes, id: \.self) { t in
                                let isSelected = selectedTypes.contains(t)
                                Text(t)
                                    .font(.caption.bold())
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(isSelected ? Theme.primary : Color(uiColor: .systemGray5))
                                    .foregroundColor(isSelected ? .white : .primary)
                                    .cornerRadius(12)
                                    .onTapGesture {
                                        if isSelected {
                                            selectedTypes.remove(t)
                                        } else {
                                            selectedTypes.insert(t)
                                        }
                                    }
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    HStack {
                        TextField("New category...", text: $customTypeInput)
                        Button(action: {
                            let trimmed = customTypeInput.trimmingCharacters(in: .whitespaces)
                            if !trimmed.isEmpty {
                                selectedTypes.insert(trimmed)
                                customTypeInput = ""
                            }
                        }) {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(Theme.primary)
                        }
                    }
                }

                Section(header: Text("Location")) {
                    TextField("Address (e.g. 2453 Fillmore St, SF)", text: $location)
                    if let hood = card.neighborhood, !hood.isEmpty {
                        HStack {
                            Text("Current Neighborhood:")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(hood)
                                .font(.caption.bold())
                                .foregroundColor(.primary)
                        }
                    }
                }

                Section(header: Text("Website & Social Links")) {
                    TextField("Website URL", text: $web)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                    TextField("Facebook URL or handle", text: $fb)
                        .autocapitalization(.none)
                    TextField("Instagram URL or handle", text: $ig)
                        .autocapitalization(.none)
                    TextField("X / Twitter URL or handle", text: $twitter)
                        .autocapitalization(.none)
                }
            }
            .navigationTitle("Edit Card")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Save") {
                            saveChanges()
                        }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
        }
    }

    private func saveChanges() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        isSaving = true
        let typesList = Array(selectedTypes)
        let primaryType = typesList.first { $0 != "associate" } ?? typesList.first

        Task {
            var updatedGeo = card.geo
            var updatedNeighborhood = card.neighborhood
            let locTrimmed = location.trimmingCharacters(in: .whitespacesAndNewlines)

            // Geocode if address was added or changed
            if locTrimmed != (card.location ?? "") {
                if !locTrimmed.isEmpty {
                    if let coords = await LocationManager.shared.geocodeAddress(locTrimmed) {
                        updatedGeo = GeoPoint(latitude: coords.lat, longitude: coords.lon)
                        updatedNeighborhood = await LocationManager.shared.reverseGeocodeNeighborhood(latitude: coords.lat, longitude: coords.lon)
                    } else {
                        updatedGeo = nil
                        updatedNeighborhood = nil
                    }
                } else {
                    updatedGeo = nil
                    updatedNeighborhood = nil
                }
            }

            var updatedCard = card
            updatedCard.name = trimmedName
            updatedCard.type = primaryType
            updatedCard.types = typesList
            if !card.isAssociate {
                updatedCard.rating = Int(rating)
            }
            updatedCard.location = locTrimmed.isEmpty ? nil : locTrimmed
            updatedCard.neighborhood = updatedNeighborhood
            updatedCard.geo = updatedGeo
            updatedCard.site = web.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : web
            updatedCard.fb = fb.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : fb
            updatedCard.ig = ig.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : ig
            updatedCard.twitter = twitter.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : twitter

            await MainActor.run {
                isSaving = false
                onSave(updatedCard)
                dismiss()
            }
        }
    }
}
