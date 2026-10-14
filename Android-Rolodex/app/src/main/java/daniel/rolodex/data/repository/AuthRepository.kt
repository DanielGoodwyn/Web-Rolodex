package daniel.rolodex.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

class AuthRepository {
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance()

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    fun isUserLoggedIn(): Boolean = currentUser != null

    suspend fun signInWithEmail(email: String, pass: String): FirebaseUser {
        val emailToUse = if (!email.contains("@")) "$email@rolodex.com" else email
        val result = auth.signInWithEmailAndPassword(emailToUse.trim(), pass).await()
        return result.user ?: throw Exception("Authentication returned null user")
    }

    suspend fun signUpWithEmail(email: String, pass: String, username: String): FirebaseUser {
        val emailToUse = if (!email.contains("@")) "$email@rolodex.com" else email
        val result = auth.createUserWithEmailAndPassword(emailToUse.trim(), pass).await()
        val user = result.user ?: throw Exception("User creation returned null")

        val formattedUsername = capitaliseFirstLetter(username)
        val profileUpdates = UserProfileChangeRequest.Builder()
            .setDisplayName(formattedUsername)
            .build()
        user.updateProfile(profileUpdates).await()

        // Sync to users collection
        val userData = hashMapOf(
            "username" to formattedUsername.lowercase(),
            "displayName" to formattedUsername,
            "email" to user.email
        )
        db.collection("users").document(user.uid).set(userData).await()

        return user
    }

    suspend fun sendPasswordReset(email: String) {
        val emailToUse = if (!email.contains("@")) "$email@rolodex.com" else email
        auth.sendPasswordResetEmail(emailToUse.trim()).await()
    }

    fun signOut() {
        auth.signOut()
    }

    fun capitaliseFirstLetter(input: String): String {
        if (input.isBlank()) return input
        return input.split(" ").joinToString(" ") { word ->
            word.split("-").joinToString("-") { part ->
                part.split("_").joinToString("_") { subpart ->
                    if (subpart.isNotEmpty()) {
                        subpart.substring(0, 1).uppercase() + subpart.substring(1).lowercase()
                    } else ""
                }
            }
        }
    }
}
