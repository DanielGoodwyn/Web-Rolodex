import SwiftUI

enum Theme {
    static let primary = Color(red: 0x19 / 255.0, green: 0x76 / 255.0, blue: 0xD2 / 255.0)
    static let primaryDark = Color(red: 0x0D / 255.0, green: 0x47 / 255.0, blue: 0xA1 / 255.0)
    static let primaryLight = Color(red: 0xBB / 255.0, green: 0xDE / 255.0, blue: 0xFB / 255.0)
    static let background = Color(uiColor: .systemGroupedBackground)
    static let cardBackground = Color(uiColor: .secondarySystemGroupedBackground)

    static let facebookBlue = Color(red: 0x18 / 255.0, green: 0x77 / 255.0, blue: 0xF2 / 255.0)
    static let instagramPink = Color(red: 0xE1 / 255.0, green: 0x30 / 255.0, blue: 0x6C / 255.0)
    static let xBlack = Color.black
    static let googleMapsBlue = Color(red: 0x1A / 255.0, green: 0x73 / 255.0, blue: 0xE8 / 255.0)

    static func ratingColor(for rating: Int) -> Color {
        switch rating {
        case 91...100:
            return Color(red: 0x66 / 255.0, green: 0xFF / 255.0, blue: 0x66 / 255.0)
        case 81...90:
            return Color(red: 0x77 / 255.0, green: 0xFF / 255.0, blue: 0x66 / 255.0)
        case 71...80:
            return Color(red: 0x88 / 255.0, green: 0xEE / 255.0, blue: 0x66 / 255.0)
        case 61...70:
            return Color(red: 0x99 / 255.0, green: 0xEE / 255.0, blue: 0x66 / 255.0)
        case 51...60:
            return Color(red: 0xAA / 255.0, green: 0xDD / 255.0, blue: 0x66 / 255.0)
        case 41...50:
            return Color(red: 0xBB / 255.0, green: 0xDD / 255.0, blue: 0x66 / 255.0)
        case 31...40:
            return Color(red: 0xCC / 255.0, green: 0xCC / 255.0, blue: 0x66 / 255.0)
        case 21...30:
            return Color(red: 0xDD / 255.0, green: 0xCC / 255.0, blue: 0x66 / 255.0)
        case 11...20:
            return Color(red: 0xEE / 255.0, green: 0xBB / 255.0, blue: 0x66 / 255.0)
        case 1...10:
            return Color(red: 0xFF / 255.0, green: 0xBB / 255.0, blue: 0x66 / 255.0)
        default:
            return Color(red: 0xFF / 255.0, green: 0xEE / 255.0, blue: 0xCC / 255.0)
        }
    }
}
