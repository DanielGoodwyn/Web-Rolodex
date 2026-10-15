import Foundation
import CoreLocation
import Combine

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    static let shared = LocationManager()

    private let manager = CLLocationManager()
    @Published var currentLocation: CLLocation?
    @Published var currentNeighborhood: String?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
        manager.startUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        self.currentLocation = loc

        Task {
            if let hood = await reverseGeocodeNeighborhood(latitude: loc.coordinate.latitude, longitude: loc.coordinate.longitude) {
                await MainActor.run {
                    self.currentNeighborhood = hood
                }
            }
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        default:
            break
        }
    }

    // MARK: - Reverse Geocode Neighborhood (Nominatim First, identical to Web & Android)
    func reverseGeocodeNeighborhood(latitude: Double, longitude: Double) async -> String? {
        guard let url = URL(string: "https://nominatim.openstreetmap.org/reverse?format=json&lat=\(latitude)&lon=\(longitude)") else {
            return nil
        }

        var request = URLRequest(url: url)
        request.addValue("Rolodex-iOS/1.0", forHTTPHeaderField: "User-Agent")
        request.addValue("en", forHTTPHeaderField: "Accept-Language")

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let address = json["address"] as? [String: Any] {

                let hoodKeys = [
                    "neighbourhood",
                    "neighborhood",
                    "quarter",
                    "suburb",
                    "city_district",
                    "district",
                    "residential",
                    "subdivision",
                    "borough"
                ]
                for key in hoodKeys {
                    if let val = address[key] as? String, !val.trimmingCharacters(in: .whitespaces).isEmpty {
                        return val
                    }
                }

                let cityKeys = ["city", "town", "village", "municipality", "county"]
                for key in cityKeys {
                    if let val = address[key] as? String, !val.trimmingCharacters(in: .whitespaces).isEmpty {
                        return val
                    }
                }
            }
        } catch {
            // Fall back to Apple CLGeocoder
        }

        // Apple CLGeocoder fallback
        if let placemarks = try? await CLGeocoder().reverseGeocodeLocation(CLLocation(latitude: latitude, longitude: longitude)),
           let pm = placemarks.first {
            return pm.subLocality ?? pm.locality
        }

        return nil
    }

    // MARK: - Forward Geocode Address
    func geocodeAddress(_ addressString: String) async -> (lat: Double, lon: Double)? {
        guard !addressString.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }

        // Apple CLGeocoder first for speed
        if let marks = try? await CLGeocoder().geocodeAddressString(addressString),
           let mark = marks.first,
           let loc = mark.location {
            return (lat: loc.coordinate.latitude, lon: loc.coordinate.longitude)
        }

        // Nominatim fallback ($0)
        guard let encoded = addressString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "https://nominatim.openstreetmap.org/search?format=json&q=\(encoded)&limit=1") else {
            return nil
        }

        var request = URLRequest(url: url)
        request.addValue("Rolodex-iOS/1.0", forHTTPHeaderField: "User-Agent")
        request.addValue("en", forHTTPHeaderField: "Accept-Language")

        if let (data, _) = try? await URLSession.shared.data(for: request),
           let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
           let first = array.first,
           let latStr = first["lat"] as? String,
           let lonStr = first["lon"] as? String,
           let lat = Double(latStr),
           let lon = Double(lonStr) {
            return (lat: lat, lon: lon)
        }

        return nil
    }

    // MARK: - Haversine Distance in Miles
    func calculateHaversineDistanceMiles(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
        let r = 3958.8 // Earth radius in miles
        let dLat = (lat2 - lat1) * .pi / 180.0
        let dLon = (lon2 - lon1) * .pi / 180.0
        let a = sin(dLat / 2) * sin(dLat / 2) +
                cos(lat1 * .pi / 180.0) * cos(lat2 * .pi / 180.0) *
                sin(dLon / 2) * sin(dLon / 2)
        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }
}
