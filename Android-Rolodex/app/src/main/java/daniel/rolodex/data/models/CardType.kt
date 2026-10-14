package daniel.rolodex.data.models

import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class CardType(
    @DocumentId
    var id: String = "",
    var type: String = "",
    var userId: String = ""
)
