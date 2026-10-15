import SwiftUI

struct AddCardView: View {
    @Environment(\.dismiss) private var dismiss
    let availableTypes: [String]
    let onSave: (Association) -> Void

    @State private var name: String = ""
    @State private var selectedTypes: Set<String> = []
    @State private var customTypeInput: String = ""
    @State private var rating: Double = 90
    @State private var location: String = ""
    @State private var web: String = ""
    @State private var fb: String = ""
    @State private var ig: String = ""
    @State private var twitter: String = ""
    @State private var isGeocoding: Bool = false

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Card Details")) {
                    TextField("Name (e.g. Philz Coffee)", text: $name)

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

                Section(header: Text("Categories (Multi-Select)")) {
                    if !availableTypes.isEmpty {
                        FlowLayout(spacing: 6) {
                            ForEach(availableTypes, id: \.self) { t in
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

                Section(header: Text("Location & Links")) {
                    TextField("Address (e.g. 2453 Fillmore St, SF)", text: $location)
                    TextField("Website / URL", text: $web)
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
            .navigationTitle("New Card")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveCard()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func saveCard() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let typesList = Array(selectedTypes)
        let primaryType = typesList.first { $0 != "associate" } ?? typesList.first

        Task {
            var geoPoint: GeoPoint? = nil
            var neighborhood: String? = nil

            let locTrimmed = location.trimmingCharacters(in: .whitespacesAndNewlines)
            if !locTrimmed.isEmpty {
                if let coords = await LocationManager.shared.geocodeAddress(locTrimmed) {
                    geoPoint = GeoPoint(latitude: coords.lat, longitude: coords.lon)
                    neighborhood = await LocationManager.shared.reverseGeocodeNeighborhood(latitude: coords.lat, longitude: coords.lon)
                }
            }

            let newCard = Association(
                id: "",
                name: trimmedName,
                type: primaryType,
                types: typesList,
                rating: Int(rating),
                location: locTrimmed.isEmpty ? nil : locTrimmed,
                neighborhood: neighborhood,
                site: web.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : web,
                fb: fb.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : fb,
                ig: ig.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : ig,
                twitter: twitter.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : twitter,
                geo: geoPoint,
                userId: FirebaseAuthService.shared.currentUser?.uid ?? ""
            )

            await MainActor.run {
                onSave(newCard)
                dismiss()
            }
        }
    }
}
