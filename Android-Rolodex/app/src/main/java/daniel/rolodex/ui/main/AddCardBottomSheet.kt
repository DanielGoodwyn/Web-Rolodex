package daniel.rolodex.ui.main

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import daniel.rolodex.data.models.Association
import daniel.rolodex.databinding.BottomSheetAddCardBinding

class AddCardBottomSheet(
    private val onCardCreated: (Association) -> Unit
) : BottomSheetDialogFragment() {

    private var _binding: BottomSheetAddCardBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = BottomSheetAddCardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.sliderRating.addOnChangeListener { _, value, _ ->
            binding.tvRatingLabel.text = "Rating: ${value.toInt()}"
        }

        binding.btnSubmitCard.setOnClickListener {
            val name = binding.etAddName.text.toString().trim()
            if (name.isEmpty()) {
                Toast.makeText(requireContext(), "Please enter a card name", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val rawTypes = binding.etAddTypes.text.toString().trim()
            val typesList = if (rawTypes.isNotEmpty()) {
                rawTypes.split(",").map { it.trim() }.filter { it.isNotEmpty() }
            } else emptyList()

            val primaryType = typesList.firstOrNull { it != "associate" } ?: typesList.firstOrNull() ?: ""
            val rating = binding.sliderRating.value.toLong()
            val location = binding.etAddLocation.text.toString().trim().ifEmpty { null }
            val web = binding.etAddWeb.text.toString().trim().ifEmpty { null }
            val fb = binding.etAddFacebook.text.toString().trim().ifEmpty { null }
            val ig = binding.etAddInstagram.text.toString().trim().ifEmpty { null }
            val twitter = binding.etAddTwitter.text.toString().trim().ifEmpty { null }

            val newCard = Association(
                name = name,
                type = primaryType,
                types = typesList,
                rating = rating,
                location = location,
                web = web,
                fb = fb,
                ig = ig,
                twitter = twitter
            )
            onCardCreated(newCard)
            dismiss()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        const val TAG = "AddCardBottomSheet"
    }
}
