package daniel.rolodex.data.repository

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import daniel.rolodex.data.models.Association
import daniel.rolodex.data.models.Note
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class RolodexRepository {
    private val db = FirebaseFirestore.getInstance()

    companion object {
        private const val TAG = "RolodexRepository"
        const val COLLECTION_ASSOCIATION = "Association"
        const val COLLECTION_NOTE = "Note"
        const val COLLECTION_TYPE = "Type"
        const val COLLECTION_USERS = "users"
    }

    fun getAssociationsFlow(userId: String): Flow<List<Association>> = callbackFlow {
        val query = db.collection(COLLECTION_ASSOCIATION)
            .whereEqualTo("userId", userId)

        val listener: ListenerRegistration = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.e(TAG, "Error listening to Association updates", error)
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    try {
                        doc.toObject(Association::class.java)?.apply { id = doc.id }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error deserializing document ${doc.id}", e)
                        null
                    }
                }
                trySend(list)
            }
        }
        awaitClose { listener.remove() }
    }

    fun getAllNotesFlow(userId: String): Flow<List<Note>> = callbackFlow {
        val query = db.collection(COLLECTION_NOTE)
            .whereEqualTo("userId", userId)

        val listener: ListenerRegistration = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.e(TAG, "Error listening to Note updates", error)
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    try {
                        doc.toObject(Note::class.java)?.apply { id = doc.id }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error deserializing note ${doc.id}", e)
                        null
                    }
                }.sortedBy { it.displayName.lowercase() }
                trySend(list)
            }
        }
        awaitClose { listener.remove() }
    }

    suspend fun getNotesForAssociation(associationId: String, userId: String): List<Note> {
        val snap = db.collection(COLLECTION_NOTE)
            .whereEqualTo("userId", userId)
            .whereEqualTo("associationId", associationId)
            .get()
            .await()
        return snap.documents.mapNotNull { doc ->
            try {
                doc.toObject(Note::class.java)?.apply { id = doc.id }
            } catch (e: Exception) {
                Log.e(TAG, "Error deserializing note ${doc.id}", e)
                null
            }
        }.sortedBy { it.displayName.lowercase() }
    }

    suspend fun getUserTypes(userId: String): List<String> {
        val snap = db.collection(COLLECTION_TYPE)
            .whereEqualTo("userId", userId)
            .get()
            .await()
        return snap.documents.mapNotNull { doc ->
            doc.getString("type")
        }.distinct().sorted()
    }

    suspend fun addCard(association: Association): String {
        val data = hashMapOf<String, Any?>(
            "name" to association.name,
            "type" to association.type,
            "types" to association.allTypes,
            "rating" to association.displayRating,
            "location" to association.location,
            "neighborhood" to association.neighborhood,
            "site" to association.websiteUrl,
            "fb" to association.facebookUrl,
            "ig" to association.instagramUrl,
            "twitter" to association.twitterUrl,
            "userId" to association.userId,
            "associationId" to association.associationId,
            "associationIds" to association.safeAssociationIds,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        if (association.geo != null) {
            data["geo"] = association.geo
        }

        val docRef = db.collection(COLLECTION_ASSOCIATION).add(data).await()

        for (t in association.allTypes) {
            if (t.isNotBlank()) {
                ensureTypeExists(t, association.userId)
            }
        }
        return docRef.id
    }

    suspend fun updateRating(cardId: String, rating: Long) {
        db.collection(COLLECTION_ASSOCIATION).document(cardId).update(
            mapOf(
                "rating" to rating,
                "updatedAt" to FieldValue.serverTimestamp()
            )
        ).await()
    }

    suspend fun updateCard(association: Association) {
        val updates = mutableMapOf<String, Any?>(
            "name" to association.name,
            "type" to association.type,
            "types" to association.allTypes,
            "rating" to association.displayRating,
            "location" to association.location,
            "neighborhood" to association.neighborhood,
            "site" to association.websiteUrl,
            "fb" to association.facebookUrl,
            "ig" to association.instagramUrl,
            "twitter" to association.twitterUrl,
            "updatedAt" to FieldValue.serverTimestamp()
        )
        if (association.geo != null) {
            updates["geo"] = association.geo
        } else {
            updates["geo"] = FieldValue.delete()
        }

        db.collection(COLLECTION_ASSOCIATION).document(association.id).update(updates).await()

        for (t in association.allTypes) {
            if (t.isNotBlank()) {
                ensureTypeExists(t, association.userId)
            }
        }
    }

    suspend fun updateLocation(
        cardId: String,
        location: String,
        neighborhood: String?,
        geo: Map<String, Any?>? = null
    ) {
        val updates = mutableMapOf<String, Any?>(
            "location" to location,
            "updatedAt" to FieldValue.serverTimestamp()
        )
        if (neighborhood != null) {
            updates["neighborhood"] = neighborhood
        }
        if (geo != null) {
            updates["geo"] = geo
        }
        db.collection(COLLECTION_ASSOCIATION).document(cardId).update(updates).await()
    }

    suspend fun updateCardTypes(cardId: String, types: List<String>, userId: String) {
        val primaryType = types.firstOrNull { it != "associate" } ?: types.firstOrNull() ?: ""
        db.collection(COLLECTION_ASSOCIATION).document(cardId).update(
            mapOf(
                "types" to types,
                "type" to primaryType,
                "updatedAt" to FieldValue.serverTimestamp()
            )
        ).await()

        for (t in types) {
            if (t.isNotBlank()) {
                ensureTypeExists(t, userId)
            }
        }
    }

    suspend fun deleteCard(cardId: String) {
        db.collection(COLLECTION_ASSOCIATION).document(cardId).delete().await()
    }

    suspend fun addNote(associationId: String, userId: String, name: String, note: String): String {
        val data = hashMapOf<String, Any?>(
            "associationId" to associationId,
            "userId" to userId,
            "name" to name.trim(),
            "note" to note.trim(),
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        val doc = db.collection(COLLECTION_NOTE).add(data).await()
        return doc.id
    }

    suspend fun deleteNote(noteId: String) {
        db.collection(COLLECTION_NOTE).document(noteId).delete().await()
    }

    // Two-way associate linking
    suspend fun linkAssociateToAssociation(
        associateName: String,
        associationId: String,
        userId: String
    ) {
        val formattedName = AuthRepository().capitaliseFirstLetter(associateName.trim())
        val snap = db.collection(COLLECTION_ASSOCIATION)
            .whereEqualTo("userId", userId)
            .get()
            .await()

        val existingAssociate = snap.documents.firstOrNull { doc ->
            val docName = doc.getString("name") ?: ""
            val docType = doc.getString("type") ?: ""
            val docTypes = (doc.get("types") as? List<*>)?.mapNotNull { it?.toString() } ?: emptyList()
            val isAssoc = docType == "associate" || docTypes.contains("associate")
            isAssoc && docName.trim().equals(formattedName, ignoreCase = true)
        }

        if (existingAssociate != null) {
            val existingIds = (existingAssociate.get("associationIds") as? List<*>)?.mapNotNull { it?.toString() }?.toMutableList()
                ?: mutableListOf()
            val singleId = existingAssociate.getString("associationId")
            if (singleId != null && !existingIds.contains(singleId)) {
                existingIds.add(singleId)
            }
            if (!existingIds.contains(associationId)) {
                existingIds.add(associationId)
            }
            db.collection(COLLECTION_ASSOCIATION).document(existingAssociate.id).update(
                mapOf(
                    "associationIds" to existingIds,
                    "associationId" to (existingAssociate.getString("associationId") ?: associationId),
                    "types" to listOf("associate"),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } else {
            // Create brand new associate
            val newAssociate = Association(
                name = formattedName,
                type = "associate",
                types = listOf("associate"),
                userId = userId,
                associationId = associationId,
                associationIds = listOf(associationId)
            )
            addCard(newAssociate)
        }
    }

    suspend fun unlinkAssociate(associateId: String, associationId: String) {
        val doc = db.collection(COLLECTION_ASSOCIATION).document(associateId).get().await()
        if (doc.exists()) {
            val ids = (doc.get("associationIds") as? List<*>)?.mapNotNull { it?.toString() }?.toMutableList()
                ?: mutableListOf()
            val singleId = doc.getString("associationId")
            if (singleId != null && !ids.contains(singleId)) {
                ids.add(singleId)
            }
            ids.remove(associationId)
            val newSingleId = ids.firstOrNull()
            db.collection(COLLECTION_ASSOCIATION).document(associateId).update(
                mapOf(
                    "associationIds" to ids,
                    "associationId" to newSingleId,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        }
    }

    private suspend fun ensureTypeExists(typeName: String, userId: String) {
        val snap = db.collection(COLLECTION_TYPE)
            .whereEqualTo("userId", userId)
            .whereEqualTo("type", typeName)
            .limit(1)
            .get()
            .await()
        if (snap.isEmpty) {
            db.collection(COLLECTION_TYPE).add(
                hashMapOf(
                    "type" to typeName,
                    "userId" to userId,
                    "createdAt" to FieldValue.serverTimestamp()
                )
            ).await()
        }
    }
}
