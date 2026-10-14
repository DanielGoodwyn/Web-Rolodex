package daniel.rolodex.ui.account

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import coil.load
import coil.transform.CircleCropTransformation
import daniel.rolodex.R
import daniel.rolodex.data.repository.AuthRepository
import daniel.rolodex.databinding.ActivityAccountBinding
import daniel.rolodex.ui.auth.LoginActivity
import kotlinx.coroutines.launch

class AccountActivity : AppCompatActivity() {
    private lateinit var binding: ActivityAccountBinding
    private val authRepository = AuthRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAccountBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val user = authRepository.currentUser
        if (user == null) {
            navigateToLogin()
            return
        }

        binding.accountToolbar.setNavigationOnClickListener {
            finish()
        }

        // Profile Details
        val displayName = user.displayName ?: "Rolodex User"
        binding.tvAccountName.text = displayName
        binding.tvAccountEmail.text = user.email ?: ""

        if (user.photoUrl != null) {
            binding.imgAccountAvatar.load(user.photoUrl) {
                crossfade(true)
                transformations(CircleCropTransformation())
                placeholder(R.drawable.ic_rolodex_logo)
                error(R.drawable.ic_rolodex_logo)
            }
        }

        binding.btnResetPasswordAccount.setOnClickListener {
            val email = user.email
            if (!email.isNullOrBlank()) {
                lifecycleScope.launch {
                    try {
                        authRepository.sendPasswordReset(email)
                        Toast.makeText(this@AccountActivity, "Reset email sent to $email", Toast.LENGTH_LONG).show()
                    } catch (e: Exception) {
                        Toast.makeText(this@AccountActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        binding.btnLogOut.setOnClickListener {
            authRepository.signOut()
            navigateToLogin()
        }
    }

    private fun navigateToLogin() {
        val intent = Intent(this, LoginActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(intent)
        finish()
    }
}
