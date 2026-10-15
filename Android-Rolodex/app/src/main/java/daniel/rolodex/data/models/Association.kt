package daniel.rolodex.data.models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.Exclude
import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class Association(
    @DocumentId
    var id: String = "",
    var name: String = "",
    var type: String? = null,
    var types: List<String>? = null,
    var rating: Long? = 0,
    var location: String? = null,
    var neighborhood: String? = null,
    var site: String? = null,
    var web: String? = null,
    var fb: String? = null,
    var facebook: String? = null,
    var ig: String? = null,
    var instagram: String? = null,
    var twitter: String? = null,
    var x: String? = null,
    var geo: Map<String, Any?>? = null,
    var userId: String = "",
    var associationId: String? = null,
    var associationIds: List<String>? = null,
    var createdAt: Timestamp? = null,
    var updatedAt: Timestamp? = null,

    // Runtime UI state
    @get:Exclude
    var isExpanded: Boolean = true,
    @get:Exclude
    var distanceMiles: Double? = null,
    @get:Exclude
    var linkedAssociateNames: List<Pair<String, String>> = emptyList(),
    @get:Exclude
    var linkedParentNames: List<Pair<String, String>> = emptyList()
) {
    val isAssociate: Boolean
        get() = type == "associate" || (types?.contains("associate") == true)

    val allTypes: List<String>
        get() {
            val list = types?.filter { it.isNotBlank() }
            if (!list.isNullOrEmpty()) return list
            if (!type.isNullOrBlank()) return listOf(type!!)
            return emptyList()
        }

    val safeAssociationIds: List<String>
        get() = associationIds ?: emptyList()

    val displayRating: Long
        get() = rating ?: 0

    val websiteUrl: String?
        get() = site?.takeIf { it.isNotBlank() } ?: web?.takeIf { it.isNotBlank() }

    val facebookUrl: String?
        get() = fb?.takeIf { it.isNotBlank() } ?: facebook?.takeIf { it.isNotBlank() }

    val instagramUrl: String?
        get() = ig?.takeIf { it.isNotBlank() } ?: instagram?.takeIf { it.isNotBlank() }

    val twitterUrl: String?
        get() = twitter?.takeIf { it.isNotBlank() } ?: x?.takeIf { it.isNotBlank() }

    val latitude: Double?
        get() = (geo?.get("latitude") as? Number)?.toDouble()

    val longitude: Double?
        get() = (geo?.get("longitude") as? Number)?.toDouble()
}
