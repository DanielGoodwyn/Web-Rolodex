import SwiftUI

/// Unified custom vector symbol view for Rolodex Modern Glyphicons.
struct Glyph: View {
    let name: String
    var size: CGFloat = 16
    var color: Color = .primary

    var body: some View {
        Image("glyph_\(name)")
            .renderingMode(.template)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: size, height: size)
            .foregroundColor(color)
    }
}
