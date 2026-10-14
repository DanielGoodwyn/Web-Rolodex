package daniel.rolodex.data.models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class Note(
    @DocumentId
    var id: String = "",
    var name: String = "",
    var note: String = "",
    var associationId: String = "",
    var userId: String = "",
    var createdAt: Timestamp? = null,
    var updatedAt: Timestamp? = null
)
