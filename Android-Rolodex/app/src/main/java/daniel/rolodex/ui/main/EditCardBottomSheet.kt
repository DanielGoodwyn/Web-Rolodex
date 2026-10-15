package daniel.rolodex.ui.main

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import daniel.rolodex.data.models.Association
import daniel.rolodex.databinding.BottomSheetEditCardBinding

class EditCardBottomSheet(
    private val card: Association,
    private val onCardUpdated: (Association) -> Unit
) : BottomSheetDialogFragment() {

    private var _binding: BottomSheetEditCardBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = BottomSheetEditCardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Prepopulate fields
        binding.etEditName.setText(card.name)
        binding.etEditTypes.setText(card.allTypes.joinToString(", "))

        if (card.isAssociate) {
            binding.editRatingContainer.visibility = View.GONE
        } else {
            binding.editRatingContainer.visibility = View.VISIBLE
            val initialRating = if (card.displayRating > 0) card.displayRating.toFloat() else 50f
            binding.sliderEditRating.value = initialRating
            binding.tvEditRatingLabel.text = "Rating: ${initialRating.toInt()}"
            binding.sliderEditRating.addOnChangeListener { _, value, _ ->
                binding.tvEditRatingLabel.text = "Rating: ${value.toInt()}"
            }
        }

        binding.etEditLocation.setText(card.location.orEmpty())
        binding.etEditWeb.setText(card.websiteUrl.orEmpty())
        binding.etEditFacebook.setText(card.facebookUrl.orEmpty())
        binding.etEditInstagram.setText(card.instagramUrl.orEmpty())
        binding.etEditTwitter.setText(card.twitterUrl.orEmpty())

        binding.btnSaveCard.setOnClickListener {
            val name = binding.etEditName.text.toString().trim()
            if (name.isEmpty()) {
                Toast.makeText(requireContext(), "Please enter a card name", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val rawTypes = binding.etEditTypes.text.toString().trim()
            val typesList = if (rawTypes.isNotEmpty()) {
                rawTypes.split(",").map { it.trim() }.filter { it.isNotEmpty() }
            } else emptyList()

            val primaryType = typesList.firstOrNull { it != "associate" } ?: typesList.firstOrNull() ?: ""
            val rating = binding.sliderEditRating.value.toLong()
            val location = binding.etEditLocation.text.toString().trim().ifEmpty { null }
            val web = binding.etEditWeb.text.toString().trim().ifEmpty { null }
            val fb = binding.etEditFacebook.text.toString().trim().ifEmpty { null }
            val ig = binding.etEditInstagram.text.toString().trim().ifEmpty { null }
            val twitter = binding.etEditTwitter.text.toString().trim().ifEmpty { null }

            val updatedCard = card.copy(
                name = name,
                type = primaryType,
                types = typesList,
                rating = if (!card.isAssociate) rating else card.rating,
                location = location,
                site = web,
                web = web,
                fb = fb,
                facebook = fb,
                ig = ig,
                instagram = ig,
                twitter = twitter,
                x = twitter
            ).apply {
                id = card.id
                userId = card.userId
                geo = card.geo
                neighborhood = card.neighborhood
                associationId = card.associationId
                associationIds = card.associationIds
            }

            onCardUpdated(updatedCard)
            dismiss()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        const val TAG = "EditCardBottomSheet"
    }
}
