package daniel.rolodex.data.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.os.Build
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class LocationHelper(private val context: Context) {
    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)
    private val httpClient = OkHttpClient()

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): Location? = withContext(Dispatchers.IO) {
        suspendCancellableCoroutine { continuation ->
            try {
                fusedLocationClient.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, null)
                    .addOnSuccessListener { loc ->
                        continuation.resume(loc)
                    }
                    .addOnFailureListener {
                        continuation.resume(null)
                    }
            } catch (e: Exception) {
                continuation.resume(null)
            }
        }
    }

    suspend fun geocodeAddress(addressStr: String): Pair<Double, Double>? = withContext(Dispatchers.IO) {
        if (addressStr.isBlank()) return@withContext null
        try {
            if (Geocoder.isPresent()) {
                val geocoder = Geocoder(context, Locale.getDefault())
                val list = geocoder.getFromLocationName(addressStr, 1)
                if (!list.isNullOrEmpty()) {
                    val addr = list[0]
                    return@withContext Pair(addr.latitude, addr.longitude)
                }
            }
        } catch (e: Exception) {
            // Fall back to Nominatim
        }

        // Free OpenStreetMap Nominatim fallback ($0)
        try {
            val url = "https://nominatim.openstreetmap.org/search?format=json&q=${java.net.URLEncoder.encode(addressStr, "UTF-8")}&limit=1"
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "Rolodex-Android/1.0")
                .build()
            val response = httpClient.newCall(request).execute()
            val body = response.body?.string()
            if (!body.isNullOrBlank()) {
                val array = org.json.JSONArray(body)
                if (array.length() > 0) {
                    val first = array.getJSONObject(0)
                    val lat = first.getDouble("lat")
                    val lon = first.getDouble("lon")
                    return@withContext Pair(lat, lon)
                }
            }
        } catch (e: Exception) {
            // Ignore
        }
        null
    }

    suspend fun reverseGeocodeNeighborhood(lat: Double, lon: Double): String? = withContext(Dispatchers.IO) {
        // 1. Query OpenStreetMap Nominatim reverse geocode first (identical to web app logic)
        try {
            val url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lon"
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "Rolodex-Android/1.0")
                .header("Accept-Language", "en")
                .build()
            val response = httpClient.newCall(request).execute()
            val body = response.body?.string()
            if (!body.isNullOrBlank()) {
                val json = JSONObject(body)
                val address = json.optJSONObject("address")
                if (address != null) {
                    // Specific neighborhood candidates matching web extractNeighborhoodFromAddress
                    val neighborhoodKeys = listOf(
                        "neighbourhood",
                        "neighborhood",
                        "quarter",
                        "suburb",
                        "city_district",
                        "district",
                        "residential",
                        "subdivision",
                        "borough"
                    )
                    for (key in neighborhoodKeys) {
                        val value = address.optString(key)
                        if (!value.isNullOrBlank()) {
                            return@withContext value
                        }
                    }

                    // Broader locality fallbacks if no neighborhood is designated
                    val fallbackKeys = listOf("city", "town", "village", "municipality", "county")
                    for (key in fallbackKeys) {
                        val value = address.optString(key)
                        if (!value.isNullOrBlank()) {
                            return@withContext value
                        }
                    }
                }
            }
        } catch (e: Exception) {
            // Fall back to Android system Geocoder
        }

        // 2. Fall back to Android system Geocoder
        try {
            if (Geocoder.isPresent()) {
                val geocoder = Geocoder(context, Locale.getDefault())
                val list = geocoder.getFromLocation(lat, lon, 1)
                if (!list.isNullOrEmpty()) {
                    val addr = list[0]
                    val subLocality = addr.subLocality
                    if (!subLocality.isNullOrBlank()) return@withContext subLocality
                    val locality = addr.locality
                    if (!locality.isNullOrBlank()) return@withContext locality
                }
            }
        } catch (e: Exception) {
            // Ignore
        }

        null
    }

    fun calculateHaversineDistanceMiles(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 3958.8 // Earth radius in miles
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }
}
