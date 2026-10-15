package daniel.rolodex.ui.auth

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import daniel.rolodex.R
import daniel.rolodex.data.repository.AuthRepository
import daniel.rolodex.databinding.ActivityLoginBinding
import daniel.rolodex.ui.main.MainActivity
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private val authRepository = AuthRepository()
    private var isSignUpMode = false
    private lateinit var googleSignInClient: GoogleSignInClient

    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode != Activity.RESULT_OK) {
            setLoading(false)
            return@registerForActivityResult
        }
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            val idToken = account?.idToken
            if (idToken != null) {
                firebaseAuthWithGoogle(idToken)
            } else {
                setLoading(false)
                showError("Google Sign-In failed: missing ID token")
            }
        } catch (e: ApiException) {
            setLoading(false)
            android.util.Log.e("LoginActivity", "Google Sign-In ApiException: statusCode=${e.statusCode}, message=${e.message}", e)
            if (e.statusCode != 12501 && e.statusCode != 16) {
                showError("Google Sign-In error (${e.statusCode}): ${e.message}")
            }
        } catch (e: Exception) {
            setLoading(false)
            android.util.Log.e("LoginActivity", "Google Sign-In general error", e)
            showError("Google Sign-In error: ${e.message}")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Configure Google Sign-In with official Web Client ID
        val webClientId = getString(R.string.default_web_client_id)
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)

        setupUI()
    }

    private fun setupUI() {
        updateModeUI()

        binding.tvToggleMode.setOnClickListener {
            isSignUpMode = !isSignUpMode
            updateModeUI()
        }

        binding.tvForgotPassword.setOnClickListener {
            ForgotPasswordDialog.show(this, lifecycleScope, authRepository)
        }

        binding.btnGoogleSignIn.setOnClickListener {
            setLoading(true)
            googleSignInClient.signOut().addOnCompleteListener {
                val signInIntent = googleSignInClient.signInIntent
                googleSignInLauncher.launch(signInIntent)
            }
        }

        binding.btnSubmit.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()
            val username = binding.etUsername.text.toString().trim()

            if (email.isEmpty() || password.isEmpty()) {
                showError("Please enter email and password")
                return@setOnClickListener
            }

            if (isSignUpMode && username.isEmpty()) {
                showError("Please enter a username")
                return@setOnClickListener
            }

            setLoading(true)
            lifecycleScope.launch {
                try {
                    if (isSignUpMode) {
                        authRepository.signUpWithEmail(email, password, username)
                    } else {
                        authRepository.signInWithEmail(email, password)
                    }
                    navigateToMain()
                } catch (e: Exception) {
                    setLoading(false)
                    showError(e.message ?: "Authentication failed")
                }
            }
        }
    }

    private fun firebaseAuthWithGoogle(idToken: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val credential = GoogleAuthProvider.getCredential(idToken, null)
                val authResult = FirebaseAuth.getInstance().signInWithCredential(credential).await()
                val user = authResult.user
                if (user != null) {
                    val formattedName = authRepository.capitaliseFirstLetter(user.displayName ?: "")
                    val userData = hashMapOf<String, Any?>(
                        "username" to formattedName.lowercase(),
                        "displayName" to formattedName,
                        "email" to user.email,
                        "pic" to (user.photoUrl?.toString() ?: "images/rolodex.png")
                    )
                    com.google.firebase.firestore.FirebaseFirestore.getInstance()
                        .collection("users").document(user.uid)
                        .set(userData, com.google.firebase.firestore.SetOptions.merge())
                        .await()
                }
                navigateToMain()
            } catch (e: Exception) {
                setLoading(false)
                showError("Google authentication failed: ${e.message}")
            }
        }
    }

    private fun updateModeUI() {
        if (isSignUpMode) {
            binding.tvSubtitle.text = getString(R.string.title_signup)
            binding.tilUsername.visibility = View.VISIBLE
            binding.btnSubmit.text = getString(R.string.sign_up)
            binding.tvToggleMode.text = getString(R.string.already_have_account)
            binding.tvForgotPassword.visibility = View.GONE
        } else {
            binding.tvSubtitle.text = getString(R.string.title_login)
            binding.tilUsername.visibility = View.GONE
            binding.btnSubmit.text = getString(R.string.sign_in)
            binding.tvToggleMode.text = getString(R.string.dont_have_account)
            binding.tvForgotPassword.visibility = View.VISIBLE
        }
    }

    private fun setLoading(isLoading: Boolean) {
        binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        binding.btnSubmit.isEnabled = !isLoading
        binding.btnGoogleSignIn.isEnabled = !isLoading
    }

    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(intent)
        finish()
    }
}
