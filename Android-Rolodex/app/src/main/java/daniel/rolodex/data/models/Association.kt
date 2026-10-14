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
    var types: List<String> = emptyList(),
    var rating: Long = 0,
    var location: String? = null,
    var neighborhood: String? = null,
    var web: String? = null,
    var facebook: String? = null,
    var instagram: String? = null,
    var twitter: String? = null,
    var userId: String = "",
    var associationId: String? = null,
    var associationIds: List<String> = emptyList(),
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
        get() = type == "associate" || types.contains("associate")

    val allTypes: List<String>
        get() = if (types.isNotEmpty()) types else if (!type.isNullOrBlank()) listOf(type!!) else emptyList()
}
