package daniel.rolodex.ui.auth

import android.content.Context
import android.widget.FrameLayout
import android.widget.Toast
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import daniel.rolodex.R
import daniel.rolodex.data.repository.AuthRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

object ForgotPasswordDialog {
    fun show(context: Context, scope: CoroutineScope, authRepository: AuthRepository) {
        val container = FrameLayout(context)
        val params = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        )
        val margin = (20 * context.resources.displayMetrics.density).toInt()
        params.setMargins(margin, margin / 2, margin, 0)

        val til = TextInputLayout(context, null, com.google.android.material.R.style.Widget_Material3_TextInputLayout_OutlinedBox)
        til.hint = context.getString(R.string.email_hint)
        val et = TextInputEditText(til.context)
        til.addView(et)
        container.addView(til, params)

        MaterialAlertDialogBuilder(context)
            .setTitle(R.string.forgot_password)
            .setMessage("Enter your email address to receive a password reset link.")
            .setView(container)
            .setPositiveButton("Send Reset Email") { _, _ ->
                val email = et.text.toString().trim()
                if (email.isNotEmpty()) {
                    scope.launch {
                        try {
                            authRepository.sendPasswordReset(email)
                            withContext(Dispatchers.Main) {
                                Toast.makeText(context, "Password reset email sent!", Toast.LENGTH_LONG).show()
                            }
                        } catch (e: Exception) {
                            withContext(Dispatchers.Main) {
                                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
