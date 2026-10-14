Parse.initialize();

var nameStartsWithValue;
var neighborhoodStartsWithValue;
var type;
var sort;
var order;
var output;
var filterAssociationId = null;
var filterAssociationName = null;
var filterAssociateCategory = null;
var availableBaseTypes = [];
var currentLocationPointLatitude = 37.776804;
var currentLocationPointLongitude = -122.416844;
var currentLocationPoint = new Parse.GeoPoint({latitude: currentLocationPointLatitude, longitude: currentLocationPointLongitude});
var currentUser;
var username;
var email;
var usernameInput;
var passwordInput;
var emailInput;
var newTypeInputValueBool = false;
var scrollToItem = "";
var toggleDisplayCardBool = true;
var sPath = window.location.pathname;
var rawPage = sPath.substring(sPath.lastIndexOf('/') + 1);
var sPage = rawPage.replace(/\.html$/, '');
if (sPage === "" || sPage === "rolodex") {
	sPage = "index";
}

$(document).ready(function() {
	if (sPage == "login") {
		checkCurrentUser();
		setUserInputs();
		userProfilePicture();
	} else if (sPage == "about") {		
		checkCurrentUser();
		userProfilePicture();		
	} else if (sPage == "index") {
		setDefaults();
		userProfilePicture();
		$(document).delegate('.display-card', 'click', function() {
			$(this).closest(".card").find(".toggle-display-card").slideToggle();
			if ($(this).html()=="▶") {
				$(this).html("▼");
			} else if ($(this).html()=="▼") {
				$(this).html("▶")
			}
		});
		$(document).delegate('#newAssociation', 'click', function() {
			newAssociation("click");
		});
		$(document).delegate('.newNote', 'click', function() {
			var noteObjectId = $(this).closest(".card").attr('id');
			newNote(noteObjectId ,"click");
		});
		$(document).delegate('.newAssociate', 'click', function() {
			var associateObjectId = $(this).closest(".card").attr('id');
			newAssociate("click", associateObjectId);
		});
		$(document).delegate('.linkParent', 'click', function() {
			var associateObjectId = $(this).closest(".card").attr('id');
			linkParentAssociation(associateObjectId, "click");
		});
		$(document).delegate('#expandCards', 'click', function() {
			$(".card").find(".toggle-display-card").slideDown();
			$(".card").find(".display-card").html("▼");
		});
		$(document).delegate('#collapseCards', 'click', function() {
			$(".card").find(".toggle-display-card").slideUp();
			$(".card").find(".display-card").html("▶");
		});
		$(document).delegate('.btn-create-card', 'click', function() {
			$("#create-card").fadeToggle();
			$("#newNameInput").focus();
		});
		$('#create-card').draggable();

		$(document).delegate('.card h2', 'click', function() {
			$(this).find('.toggleCollapseGlyphicon').toggleClass('glyphicon-expand').toggleClass('glyphicon-collapse-down');
		});

		$(document).delegate('.locationInput', 'focusout', function() {
			var associationObjectId = $(this).closest(".card").attr('id');
			updateLocation(associationObjectId, "focusout");
		});
		$(document).delegate('.site', 'focusout', function() {
			var associationObjectId = $(this).closest(".card").attr('id');
			updateSite(associationObjectId, "focusout");
		});
		$(document).delegate('.fb', 'focusout', function() {
			var associationObjectId = $(this).closest(".card").attr('id');
			updateFb(associationObjectId, "focusout");
		});
		$(document).delegate('.ig', 'focusout', function() {
			var associationObjectId = $(this).closest(".card").attr('id');
			updateIg(associationObjectId, "focusout");
		});
		$(document).delegate('.twitter, .x', 'focusout', function() {
			var associationObjectId = $(this).closest(".card").attr('id');
			updateTwitter(associationObjectId, "focusout");
		});
	}
});

function extractNeighborhoodFromAddress(addr, defaultName) {
	if (!addr) return defaultName || "-";
	return addr.neighbourhood || addr.suburb || addr.city_district || addr.district || addr.quarter || addr.city || addr.town || addr.village || addr.county || defaultName || "-";
}

var US_STATES_MAP = {
	"alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
	"colorado": "CO", "connecticut": "CT", "delaware": "DE", "district of columbia": "DC",
	"florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID", "illinois": "IL",
	"indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA",
	"maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
	"mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
	"new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
	"north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
	"oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
	"south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
	"virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY"
};

function cleanRawAddress(str, userInput) {
	if (!str) return "";
	var s = String(str).trim();

	// Check if string matches raw Nominatim US display_name pattern:
	// e.g. "2431;2453;2455, Fillmore Street, Pacific Heights, San Francisco, California, 94115, United States"
	// or "3101, 24th Street, Mission, San Francisco, California, 94110, United States"
	var parts = s.split(",").map(function(p) { return p.trim(); });
	if (parts.length >= 6 && /^(?:united states|usa)$/i.test(parts[parts.length - 1])) {
		parts.pop();
		var zip = parts[parts.length - 1];
		if (/^\d{5}(?:-\d{4})?$/.test(zip)) {
			parts.pop();
			var state = parts.pop();
			var stateCode = US_STATES_MAP[state.toLowerCase()] || state;
			var city = parts.pop();
			var house = parts[0];
			if (/^[\d;,\s]+[A-Za-z]?$/.test(house) && parts.length >= 2) {
				var road = parts[1];
				if (house.indexOf(";") !== -1) {
					var houseParts = house.split(";").map(function(h) { return h.trim(); }).filter(Boolean);
					var matched = null;
					if (userInput) {
						for (var i = 0; i < houseParts.length; i++) {
							if (new RegExp("\\b" + houseParts[i] + "\\b").test(userInput)) {
								matched = houseParts[i];
								break;
							}
						}
					}
					house = matched || houseParts[0];
				}
				return house + " " + road + ", " + city + ", " + stateCode + " " + zip;
			}
		}
	}

	// General cleanup: remove trailing ", United States" / ", USA"
	s = s.replace(/,\s*(?:United States|USA)\s*$/i, "");

	// Clean semicolon house numbers (e.g. 2431;2453;2455 -> 2453 or 2431)
	s = s.replace(/\b(\d+[A-Za-z]?)(?:;\d+[A-Za-z]?)+\b/g, function(match) {
		var nums = match.split(";").map(function(n) { return n.trim(); });
		if (userInput) {
			for (var i = 0; i < nums.length; i++) {
				if (new RegExp("\\b" + nums[i] + "\\b").test(userInput)) return nums[i];
			}
		}
		return nums[0];
	});

	// Remove comma between house number and road (e.g. "3101, 24th Street" -> "3101 24th Street")
	s = s.replace(/(^|[,\n]\s*)(\d+[A-Za-z]?),\s+([A-Za-z])/g, "$1$2 $3");

	// Convert ", California, 94115" -> ", CA 94115"
	s = s.replace(/,\s*([A-Za-z\s]+),\s*(\d{5}(?:-\d{4})?)\s*$/i, function(m, stateName, zip) {
		var key = stateName.trim().toLowerCase();
		if (US_STATES_MAP[key]) {
			return ", " + US_STATES_MAP[key] + " " + zip;
		}
		return m;
	});

	return s;
}

function expandAddressAbbreviations(str) {
	if (!str) return "";
	var s = String(str).trim();
	var replacements = [
		[/\bctr\b\.?/gi, "Center"],
		[/\bct\b\.?/gi, "Court"],
		[/\bst\b\.?/gi, "Street"],
		[/\bave\b\.?/gi, "Avenue"],
		[/\bblvd\b\.?/gi, "Boulevard"],
		[/\brd\b\.?/gi, "Road"],
		[/\bdr\b\.?/gi, "Drive"],
		[/\bln\b\.?/gi, "Lane"],
		[/\bpl\b\.?/gi, "Place"],
		[/\bcir\b\.?/gi, "Circle"],
		[/\bpkwy\b\.?/gi, "Parkway"],
		[/\bhwy\b\.?/gi, "Highway"],
		[/\bsq\b\.?/gi, "Square"],
		[/\bste\b\.?/gi, "Suite"],
		[/\bapt\b\.?/gi, "Apartment"]
	];
	for (var i = 0; i < replacements.length; i++) {
		s = s.replace(replacements[i][0], replacements[i][1]);
	}
	return s;
}

function prepareGeocodeQuery(str) {
	var s = expandAddressAbbreviations(str);
	// Strip interior unit / suite / floor / apartment numbers for geocoding search because OSM does not index them
	s = s.replace(/,\s*(?:Suite|Ste|Apt|Apartment|Unit|Floor|Fl|#)\s*[\w-]+/gi, "");
	s = s.replace(/\b(?:Suite|Ste|Apt|Apartment|Unit|Floor|Fl|#)\s*[\w-]+,?\s*/gi, "");
	return s.trim();
}

function formatCleanAddress(item, userInput) {
	if (!item) return cleanRawAddress(userInput || "", userInput);
	var addr = item.address;
	if (!addr) {
		return cleanRawAddress(item.display_name || userInput, userInput);
	}

	var userHouseMatch = userInput ? String(userInput).trim().match(/^(\d+[A-Za-z]?)\b/) : null;
	var userHouse = userHouseMatch ? userHouseMatch[1] : null;

	// 1. Resolve House Number
	var rawHouse = addr.house_number || addr.street_number || addr.housenumber || "";
	var houseNumber = rawHouse;
	if (rawHouse.indexOf(";") !== -1 || rawHouse.indexOf(",") !== -1) {
		var parts = rawHouse.split(/[;,]+/).map(function(s) { return s.trim(); }).filter(Boolean);
		var matched = null;
		if (userHouse) {
			for (var i = 0; i < parts.length; i++) {
				if (parts[i] === userHouse) {
					matched = parts[i];
					break;
				}
			}
		}
		houseNumber = matched || parts[0];
	}

	// Never drop user-specified house number if geocoder lost it or returned a contradictory one
	if (userHouse) {
		if (!houseNumber || (houseNumber !== userHouse && !new RegExp("\\b" + userHouse + "\\b").test(houseNumber))) {
			houseNumber = userHouse;
		}
	}

	// 2. Road / Street / Locality
	var road = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.highway || addr.locality || addr.place || addr.square || addr.commercial || "";
	if (!road && item.name && item.name !== item.display_name) {
		road = item.name;
	}

	// If road ends with a contradictory number (e.g. "Embarcadero Center 1" when userHouse is "5"), strip the wrong number
	if (userHouse && /\s+\d+$/.test(road)) {
		var trailingNumMatch = road.match(/\s+(\d+)$/);
		if (trailingNumMatch && trailingNumMatch[1] !== userHouse) {
			road = road.replace(/\s+\d+$/, "");
		}
	}

	// 3. City / Town
	var city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || addr.county || "";

	// 4. State
	var state = addr.state || "";
	var countryCode = (addr.country_code || "").toLowerCase();

	if (countryCode === "us") {
		if (addr["ISO3166-2-lvl4"] && addr["ISO3166-2-lvl4"].indexOf("US-") === 0) {
			state = addr["ISO3166-2-lvl4"].replace("US-", "");
		} else if (state && US_STATES_MAP[state.toLowerCase()]) {
			state = US_STATES_MAP[state.toLowerCase()];
		}
	}

	// 5. Postcode
	var postcode = addr.postcode || "";

	// Check if user input included a suite/unit
	var unitMatch = userInput ? String(userInput).match(/\b((?:suite|ste|apt|apartment|unit|floor|fl|#)\s*[\w-]+)\b/i) : null;
	var unitPart = unitMatch ? unitMatch[1] : "";

	// Build street part
	var streetPart = "";
	if (houseNumber && road) {
		streetPart = houseNumber + " " + road;
	} else if (road) {
		streetPart = (userHouse ? (userHouse + " ") : "") + road;
	} else if (houseNumber) {
		streetPart = houseNumber;
	} else if (item.name && item.name !== item.display_name) {
		streetPart = item.name;
	}

	if (streetPart && unitPart && !new RegExp(unitPart, "i").test(streetPart)) {
		streetPart = streetPart + ", " + unitPart;
	}

	// Build city/state/zip part
	var cityStatePart = "";
	if (city && state) {
		cityStatePart = city + ", " + state + (postcode ? " " + postcode : "");
	} else if (city) {
		cityStatePart = city + (postcode ? " " + postcode : "");
	} else if (state) {
		cityStatePart = state + (postcode ? " " + postcode : "");
	} else if (postcode) {
		cityStatePart = postcode;
	}

	var result = "";
	if (streetPart && cityStatePart) {
		result = streetPart + ", " + cityStatePart;
	} else if (streetPart) {
		result = streetPart;
	} else if (cityStatePart) {
		result = cityStatePart;
	}

	if (countryCode !== "us" && addr.country && result) {
		result = result + ", " + addr.country;
	}

	return result || cleanRawAddress(item.display_name || userInput, userInput);
}

function freeGeocodeAddress(address, callback) {
	if (!address || !address.trim()) {
		if (callback) callback({ success: false, error: "Empty address" });
		return;
	}

	var rawInput = address.trim();
	var userHouseMatch = rawInput.match(/^(\d+[A-Za-z]?)\b/);
	var userHouse = userHouseMatch ? userHouseMatch[1] : null;

	var searchQuery = prepareGeocodeQuery(rawInput);

	var doNominatimRequest = function(queryStr, onDone, onFail) {
		var url = "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=" + encodeURIComponent(queryStr);
		$.ajax({
			url: url,
			type: "GET",
			dataType: "json",
			timeout: 8000,
			headers: {
				"Accept-Language": "en"
			},
			success: function(data) {
				if (data && data.length > 0) {
					onDone(data);
				} else {
					onFail();
				}
			},
			error: function() {
				onFail();
			}
		});
	};

	var handleResults = function(data) {
		var selectedItem = data[0];
		if (userHouse && data.length > 1) {
			for (var i = 0; i < data.length; i++) {
				var it = data[i];
				var h = it.address && (it.address.house_number || it.address.housenumber || it.address.street_number);
				if (h && (h === userHouse || new RegExp("\\b" + userHouse + "\\b").test(h))) {
					selectedItem = it;
					break;
				}
				if (it.display_name && (new RegExp("^" + userHouse + "\\b").test(it.display_name) || new RegExp("\\b" + userHouse + ",?\\s+").test(it.display_name))) {
					selectedItem = it;
					break;
				}
			}
		}

		var lat = parseFloat(selectedItem.lat);
		var lng = parseFloat(selectedItem.lon);
		var neighborhood = extractNeighborhoodFromAddress(selectedItem.address, rawInput.split(',')[0].trim());
		var formattedAddress = formatCleanAddress(selectedItem, rawInput);
		if (callback) {
			callback({
				success: true,
				latitude: lat,
				longitude: lng,
				neighborhood: neighborhood,
				formatted_address: formattedAddress,
				source: "nominatim"
			});
		}
	};

	doNominatimRequest(searchQuery, handleResults, function() {
		// If query had zip or extra details, try query without zip code
		var fallbackQuery = searchQuery.replace(/\b\d{5}(?:-\d{4})?\b/, "").trim().replace(/,\s*,/g, ",");
		if (fallbackQuery !== searchQuery && fallbackQuery.length > 3) {
			doNominatimRequest(fallbackQuery, handleResults, function() {
				tryGoogleGeocode(rawInput, callback);
			});
		} else {
			tryGoogleGeocode(rawInput, callback);
		}
	});
}

function tryGoogleGeocode(address, callback) {
	if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
		try {
			var geocoder = new google.maps.Geocoder();
			geocoder.geocode({ 'address': address }, function(results, status) {
				if (status == google.maps.GeocoderStatus.OK && results && results[0]) {
					var lat = results[0].geometry.location.lat();
					var lng = results[0].geometry.location.lng();
					var formatted = results[0].formatted_address;
					var neighborhood = results[0].address_components[0].long_name;
					for (var i = 0; i < results[0].address_components.length; i++) {
						var comp = results[0].address_components[i];
						if (comp.types.indexOf("neighborhood") !== -1 || comp.types.indexOf("locality") !== -1) {
							neighborhood = comp.long_name;
							break;
						}
					}
					if (callback) {
						callback({
							success: true,
							latitude: lat,
							longitude: lng,
							neighborhood: neighborhood,
							formatted_address: formatted,
							source: "google"
						});
					}
					return;
				}
				if (callback) callback({ success: false, error: status });
			});
			return;
		} catch (e) {
			if (callback) callback({ success: false, error: e.message });
			return;
		}
	}
	if (callback) callback({ success: false, error: "Geocoder unavailable" });
}

function freeReverseGeocode(lat, lng, callback) {
	var url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lng);
	$.ajax({
		url: url,
		type: "GET",
		dataType: "json",
		timeout: 8000,
		headers: {
			"Accept-Language": "en"
		},
		success: function(data) {
			if (data && data.address) {
				var neighborhood = extractNeighborhoodFromAddress(data.address, "Local Area");
				if (callback) {
					callback({
						success: true,
						neighborhood: neighborhood,
						displayName: data.display_name,
						source: "nominatim"
					});
				}
			} else {
				tryGoogleReverseGeocode(lat, lng, callback);
			}
		},
		error: function() {
			tryGoogleReverseGeocode(lat, lng, callback);
		}
	});
}

function tryGoogleReverseGeocode(lat, lng, callback) {
	if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
		try {
			var geocoder = new google.maps.Geocoder();
			geocoder.geocode({ 'address': lat + ", " + lng }, function(results, status) {
				if (status == google.maps.GeocoderStatus.OK && results && results[0]) {
					var neighborhood = "Current Location";
					for (var i = 0; i < results[0].address_components.length; i++) {
						var comp = results[0].address_components[i];
						if (comp.types.indexOf("neighborhood") !== -1 || comp.types.indexOf("locality") !== -1) {
							neighborhood = comp.long_name;
							break;
						}
					}
					if (callback) {
						callback({
							success: true,
							neighborhood: neighborhood,
							source: "google"
						});
					}
					return;
				}
				if (callback) callback({ success: false, error: status });
			});
			return;
		} catch (e) {
			if (callback) callback({ success: false, error: e.message });
			return;
		}
	}
	if (callback) callback({ success: false, error: "Geocoder unavailable" });
}

function setDefaults() {
	var sortEl = document.getElementById("sortSelect");
	sort = sortEl ? sortEl.value : "name";
	setNameStartsWithValue(false);
	Parse.GeoPoint.current({
		success: function (point) {
			currentLocationPoint = point;
			currentLocationPointLatitude = currentLocationPoint.latitude;
			currentLocationPointLongitude = currentLocationPoint.longitude;
			freeReverseGeocode(currentLocationPointLatitude, currentLocationPointLongitude, function(res) {
				if (res && res.success && res.neighborhood) {
					neighborhood = res.neighborhood;
					setElementById("hood", "<span><img src='images/hood.png'></span><span>" + neighborhood + "</span>");
				} else {
					setElementById("hood", "<span><img src='images/hood.png'></span><span>SF Bay Area</span>");
				}
				setOrder("ascending", false);
				setTypeSelect();
			});
		},
		error: function(error) {
			setTypeSelect();
			setElementById("hood", "<span><img src='images/hood.png'></span><span>San Francisco (default)</span>");
		}
	});
	setCurrentUser();
}

function setUserInputs() {
	var currentUser = Parse.User.current();
	var pic;
	if (currentUser) {
		username = currentUser.getUsername();
		email = currentUser.getEmail();
		pic = currentUser.get("pic") || "images/rolodex.png";
		userId = currentUser.id;
		setElementById("usernameDiv", "<b>" + capitaliseFirstLetter(username) + "</b>");
		document.getElementById("changeUsernameInput").value = capitaliseFirstLetter(username);
		document.getElementById("changeEmailInput").value = email;
		document.getElementById("profilePictureInput").value = pic;
		$("#usernameInput").hide();
		$("#emailInput").hide();
		$("#changeUsernameInput").show();
		$("#changeEmailInput").show();
		$("#go").show();
		$("#loginBtn").hide();
		$("#signupBtn").hide();
		$(".accountInfo").show();
		$("#passwordInput").hide();
		$("#loginAlert").show();
		$("#forgotPasswordSection").hide();
		$("#googleAuthSection").hide();
		var authUser = (window.firebase && firebase.auth) ? firebase.auth().currentUser : null;
		if (authUser && authUser.photoURL) {
			$("#googlePicBtn").show();
		} else {
			$("#googlePicBtn").hide();
		}
		getProfilePicture();
	} else {
		setElementById("usernameDiv", "log in to begin.");
		$("#usernameInput").show();
		$("#emailInput").show();
		$("#changeUsernameInput").hide();
		$("#changeEmailInput").hide();
		$("#go").hide();
		$("#loginBtn").show();
		$("#signupBtn").show();
		$(".accountInfo").hide();
		$("#passwordInput").show();
		$(".loginAlert").hide();
		$("#forgotPasswordSection").show();
		$("#googleAuthSection").show();
		showForgotPassword(false);
	}
}

function checkCurrentUser() {
	var currentUser = Parse.User.current();
	if (currentUser) {
		username = currentUser.getUsername();
		userId = currentUser.id;
		setElementById("usernameDiv", "<b>" + capitaliseFirstLetter(username) + "</b>");
		var goBtn = document.getElementById("go");
		if (goBtn) goBtn.style.display = "inline-block";
		if (sPage == "login") {
			document.getElementById("loginBtn").style.display = "none";
			document.getElementById("signupBtn").style.display = "none";
			$("#googleAuthSection").hide();
		}
		getProfilePicture();
	} else {
		if (sPage == "about") {
			$('.login-alert').removeClass('alert-info').addClass('alert-danger');
		} else if (sPage == "login") {
			var goBtn = document.getElementById("go");
			if (goBtn) goBtn.style.display = "none";
			document.getElementById("loginBtn").style.display = "inline-block";
			document.getElementById("signupBtn").style.display = "inline-block";
			$("#googleAuthSection").show();
		}
		setElementById("usernameDiv", "log in to begin.");
	}
}

function setCurrentUser() {
	var currentUser = Parse.User.current();
	if (currentUser) {
		username = currentUser.getUsername();
		userId = currentUser.id;
		setElementById("usernameDiv", "<b>" + capitaliseFirstLetter(username) + "</b>");
		getProfilePicture();
	} else {
		if (typeof Parse !== 'undefined' && Parse._authResolving) {
			return; // Wait for Firebase Auth state to resolve before redirecting
		}
	    window.location.href = 'login';
	}
}

function signup(e) {
	if (e.keyCode == 13 || e == "click") {
		usernameInput = document.getElementById("usernameInput").value.trim().toLowerCase();
		passwordInput = document.getElementById("passwordInput").value;
		emailInput = document.getElementById("emailInput").value.trim().toLowerCase();
		if (!usernameInput || !passwordInput || !emailInput) {
			alert("Please fill in username, password, and email to sign up.");
			return;
		}
		var user = new Parse.User();
		user.set("username", usernameInput);
		user.set("password", passwordInput);
		user.set("email", emailInput);
		user.set("pic", "images/rolodex.png");
		user.signUp(null, {
		  success: function(user) {
			var currentUser = Parse.User.current();
			username = currentUser.getUsername();
			userId = currentUser.id;
			setElementById("usernameDiv", "<b>" + capitaliseFirstLetter(username) + "</b>");
			getProfilePicture();
			setUserInputs();
			alert("Signed up successfully! Welcome, " + capitaliseFirstLetter(username) + ".");
		  },
		  error: function(user, error) {
		    alert("Sign up error: " + (error.message || error.code || "Unknown error"));
		  }
		});
	}
}

function login(e) {
	if (e.keyCode == 13 || e == "click") {
		usernameInput = document.getElementById("usernameInput").value.trim().toLowerCase();
		passwordInput = document.getElementById("passwordInput").value;
		if (!usernameInput || !passwordInput) {
			alert("Please enter username/email and password to log in.");
			return;
		}
		Parse.User.logIn(usernameInput, passwordInput, {
			success: function(user) {
				var currentUser = Parse.User.current();
				username = currentUser.getUsername();
				userId = currentUser.id;
				setElementById("usernameDiv", "<b>" + capitaliseFirstLetter(username) + "</b>");
				getProfilePicture();
				setUserInputs();
			},
			error: function(user, error) {
				alert("Log in error: " + (error.message || error.code || "Unknown error"));
			}
		});
	}
}

function logout() {
	Parse.User.logOut();
	setCurrentUser();
}

function loginWithGoogle() {
	Parse.User.logInWithGoogle({
		success: function(user) {
			var currentUser = Parse.User.current();
			username = currentUser.getUsername();
			userId = currentUser.id;
			setElementById("usernameDiv", "<b>" + capitaliseFirstLetter(username) + "</b>");
			getProfilePicture();
			setUserInputs();
			alert("Signed in with Google successfully! Welcome, " + capitaliseFirstLetter(username) + ".");
		},
		error: function(user, error) {
			alert("Google Sign-In error: " + (error.message || error.code || "Failed to sign in with Google"));
		}
	});
}

function setUsername(event) {
	if (event.which == 13 || event.keyCode == 13 || event == "click") {
		currentUser = Parse.User.current();
		username = $("#changeUsernameInput").val().trim().toLowerCase();
		if (!username) {
			alert("Username cannot be empty.");
			return;
		}
		currentUser.save({
			username: username
		}, {
			success: function(currentUser) {
				alert("Username set to " + capitaliseFirstLetter(username) + ".");
				window.location.href = 'login';
			},
			error: function(currentUser, error) {
				alert("Error: " + (error.message || error.code));
			}
		});
	}
}

function setEmail(event) {
	if (event.which == 13 || event.keyCode == 13 || event == "click") {
		currentUser = Parse.User.current();
		email = $("#changeEmailInput").val().trim().toLowerCase();
		if (!email || !email.includes('@')) {
			alert("Please enter a valid email address.");
			return;
		}
		currentUser.save({
			email: email
		}, {
			success: function(currentUser) {
				alert("Email set to " + email + ".");
				window.location.href = 'login';
			},
			error: function(currentUser, error) {
				alert("Error: " + (error.message || error.code));
			}
		});
	}
}

function resetPassword() {
  currentUser = Parse.User.current();
  var email = $("#changeEmailInput").val() || (currentUser ? currentUser.getEmail() : "");
  if (!email) {
    alert("No email address found for password reset.");
    return;
  }
  Parse.User.requestPasswordReset(email, {
    success: function() {
		alert("Password reset request sent to " + email + ".");
    },
    error: function(error) {
      alert("Error: " + (error.message || error.code));
    }
  });
}

function showForgotPassword(show) {
	if (show) {
		var prefill = $("#emailInput").val() || $("#usernameInput").val();
		if (prefill && prefill.includes('@')) {
			$("#forgotPasswordEmailInput").val(prefill);
		}
		$("#forgotPasswordBox").slideDown();
		$("#forgotPasswordLink").hide();
	} else {
		$("#forgotPasswordBox").slideUp();
		$("#forgotPasswordLink").show();
		$("#forgotPasswordStatus").html("");
	}
}

function sendForgotPassword() {
	var email = $("#forgotPasswordEmailInput").val().trim().toLowerCase();
	if (!email || !email.includes('@')) {
		alert("Please enter a valid email address.");
		return;
	}
	$("#forgotPasswordStatus").html("<span style='color:#666;'>Sending password reset email...</span>");
	Parse.User.requestPasswordReset(email, {
		success: function() {
			alert("Password reset email sent to " + email + ". Check your inbox!");
			$("#forgotPasswordStatus").html("<span class='text-success'><b>Reset email sent to " + email + "!</b></span>");
			setTimeout(function() { showForgotPassword(false); }, 3000);
		},
		error: function(error) {
			alert("Reset error: " + (error.message || error.code || "Failed to send reset email"));
			$("#forgotPasswordStatus").html("<span class='text-danger'>Error: " + (error.message || error.code) + "</span>");
		}
	});
}

function getProfilePicture() {
	var profilePicture;
	var currentUser = Parse.User.current();
	if (currentUser) {
		profilePicture = currentUser.get('pic') || "images/rolodex.png";
		if (document.getElementById("profilePicture")) {
			setElementById("profilePicture", "<a href='" + profilePicture + "' target='_blank' title='View full photo'><img src='" + profilePicture + "' alt='Profile Picture'></a>");
		}
		if (document.getElementById("profilePictureInput") && !document.getElementById("profilePictureInput").matches(':focus')) {
			document.getElementById("profilePictureInput").value = profilePicture;
		}
		userProfilePicture();
	}
}

function setProfilePicture(event) {
	if (event.which == 13 || event.keyCode == 13 || event == "click") {
		var profilePicture = (document.getElementById("profilePictureInput").value || "").trim();
		if (!profilePicture) {
			alert("Please enter a valid image URL.");
			return;
		}
		var currentUser = Parse.User.current();
		if (currentUser) {
			currentUser.set("pic", profilePicture);
			currentUser.save(null, {
				success: function(currentUser) {
					getProfilePicture();
					alert("Profile picture URL updated successfully!");
				},
				error: function(currentUser, error) {
					alert("Error: " + (error.message || error.code));
				}
			});
		}
	}
}

function uploadProfilePicture(input) {
	if (!input.files || !input.files[0]) return;
	var file = input.files[0];
	if (!file.type || !file.type.match(/^image\//i)) {
		alert("Please select a valid image file.");
		return;
	}

	var reader = new FileReader();
	reader.onload = function(e) {
		var img = new Image();
		img.onload = function() {
			var maxDim = 256;
			var width = img.width;
			var height = img.height;
			if (width > height) {
				if (width > maxDim) {
					height = Math.round((height * maxDim) / width);
					width = maxDim;
				}
			} else {
				if (height > maxDim) {
					width = Math.round((width * maxDim) / height);
					height = maxDim;
				}
			}

			var canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0, width, height);

			var dataUrl = canvas.toDataURL('image/jpeg', 0.88);
			var currentUser = Parse.User.current();
			if (currentUser) {
				currentUser.set("pic", dataUrl);
				currentUser.save(null, {
					success: function() {
						if (document.getElementById("profilePictureInput")) {
							document.getElementById("profilePictureInput").value = dataUrl;
						}
						getProfilePicture();
						alert("Profile photo uploaded and updated successfully!");
					},
					error: function(user, error) {
						alert("Failed to save profile photo: " + (error.message || error.code));
					}
				});
			}
		};
		img.onerror = function() {
			alert("Could not process the selected image file.");
		};
		img.src = e.target.result;
	};
	reader.readAsDataURL(file);
}

function useGoogleProfilePicture() {
	var currentUser = Parse.User.current();
	var authUser = (window.firebase && firebase.auth) ? firebase.auth().currentUser : null;
	var googlePhoto = authUser ? authUser.photoURL : null;
	if (!googlePhoto) {
		alert("No Google profile photo found for this account.");
		return;
	}
	if (currentUser) {
		currentUser.set("pic", googlePhoto);
		currentUser.save(null, {
			success: function() {
				if (document.getElementById("profilePictureInput")) {
					document.getElementById("profilePictureInput").value = googlePhoto;
				}
				getProfilePicture();
				alert("Profile picture set to your Google account photo!");
			},
			error: function(user, error) {
				alert("Error: " + (error.message || error.code));
			}
		});
	}
}

function userProfilePicture() {
	var profilePicture;
	var currentUser = Parse.User.current();
	if (currentUser) {
		profilePicture = currentUser.get('pic') || "images/rolodex.png";
		if (document.getElementById("userProfilePicture")) {
			setElementById("userProfilePicture", "<img src='" + profilePicture + "' alt='User'>");
		}
	}
}

function setTypeSelect() {
	var typeSelectDiv = "<select id='typeSelect' onchange='setType()'>";
	var query = new Parse.Query("Type");
	query.equalTo("userId", userId);
	query.ascending("type");
	query.find({
	success: function(results) {
		var orgTypes = [];
		for (var i = 0; i < results.length; i++) {
			var object = results[i];
			var tVal = object.get('type');
			if (tVal && tVal !== 'associate' && orgTypes.indexOf(tVal) === -1) {
				orgTypes.push(tVal);
			}
		}

		availableBaseTypes = orgTypes.slice();
		availableBaseTypes.push('associate');

		if (orgTypes.length === 0) {
			typeSelectDiv += "<option value='all_associations'>all associations</option>";
			typeSelectDiv += "<option value='associate'>all associates</option>";
			typeSelectDiv += "</select>";
			setElementById("typeSelectDiv", typeSelectDiv);
			setType();
			return;
		}

		$(".panels").show();
		$("#checkNamesDiv").show();
		$("#expandCards").show();
		$("#collapseCards").show();

		// Association cards optgroup
		typeSelectDiv += "<optgroup label='Association Cards'>";
		typeSelectDiv += "<option value='all_associations'>all associations</option>";
		for (var j = 0; j < orgTypes.length; j++) {
			typeSelectDiv += "<option value='" + orgTypes[j] + "'>" + orgTypes[j] + "</option>";
		}
		typeSelectDiv += "</optgroup>";

		// Associate cards optgroup
		typeSelectDiv += "<optgroup label='Associate Cards'>";
		typeSelectDiv += "<option value='associate'>all associates</option>";
		for (var k = 0; k < orgTypes.length; k++) {
			typeSelectDiv += "<option value='associate_type:" + orgTypes[k] + "'>" + orgTypes[k] + " associates</option>";
		}
		typeSelectDiv += "</optgroup>";
		typeSelectDiv += "</select>";

		setElementById("typeSelectDiv", typeSelectDiv);

		// Synchronize dropdown selection with active filter state
		var targetVal;
		if (filterAssociateCategory) {
			targetVal = "associate_type:" + filterAssociateCategory;
		} else if (type === "associate") {
			targetVal = "associate";
		} else if (type === "all_associations") {
			targetVal = "all_associations";
		} else if (type && orgTypes.indexOf(type) !== -1) {
			targetVal = type;
		} else {
			targetVal = "all_associations";
		}

		if (document.getElementById("typeSelect")) {
			document.getElementById("typeSelect").value = targetVal;
		}
		setType();
	},
	error: function(error) {
		alert("Error: " + error.code + " " + error.message);
	}
	});
}

function setType() {
	var typeSelect = document.getElementById("typeSelect");
	var selVal = "";
	if (newTypeInputValueBool) {
		selVal = $("#newTypeInput").val();
		newTypeInputValueBool = false;		
	} else if (typeSelect && typeSelect.options && typeSelect.selectedIndex >= 0) {
		selVal = typeSelect.options[typeSelect.selectedIndex].value;
	}

	if (selVal === "all_associations") {
		type = "all_associations";
		filterAssociateCategory = null;
		filterAssociationId = null;
		filterAssociationName = null;
	} else if (selVal.indexOf("associate_type:") === 0) {
		type = "associate";
		filterAssociateCategory = selVal.replace("associate_type:", "");
		filterAssociationId = null;
		filterAssociationName = null;
	} else if (selVal === "associate") {
		type = "associate";
		filterAssociateCategory = null;
		filterAssociationId = null;
		filterAssociationName = null;
	} else {
		type = selVal;
		filterAssociateCategory = null;
		filterAssociationId = null;
		filterAssociationName = null;
	}

	if (document.getElementById("newTypeInput")) {
		document.getElementById("newTypeInput").value = (type === "all_associations" || type === "associate") ? "" : (type || "");
	}
	setSort();
}

function toggleCardType(AssociationObjectId, typeName, isChecked) {
	var Association = Parse.Object.extend("Association");
	var query = new Parse.Query(Association);
	query.get(AssociationObjectId, {
		success: function(assoc) {
			var types = assoc.get('types');
			if (!Array.isArray(types)) {
				var legacyT = assoc.get('type');
				types = legacyT ? [legacyT] : [];
			}
			types = types.slice();

			if (isChecked) {
				if (types.indexOf(typeName) === -1) {
					types.push(typeName);
				}
				// If checking an association type, remove 'associate'
				if (typeName !== 'associate') {
					var aIdx = types.indexOf('associate');
					if (aIdx !== -1) types.splice(aIdx, 1);
				} else {
					// If checking 'associate', it is exclusively associate
					types = ['associate'];
					var menu = document.querySelector("#" + AssociationObjectId + "typeDropdown ul.dropdown-menu");
					if (menu) {
						var cbs = menu.querySelectorAll("input[type='checkbox']");
						for (var c = 0; c < cbs.length; c++) {
							if (cbs[c].value !== 'associate') cbs[c].checked = false;
						}
					}
				}
			} else {
				var idx = types.indexOf(typeName);
				if (idx !== -1) {
					types.splice(idx, 1);
				}
			}

			var primaryType = types.length > 0 ? types[0] : "misc";
			assoc.set("types", types);
			assoc.set("type", primaryType);
			assoc.save(null, {
				success: function() {
					var labelText = types.length > 0 ? types.join(", ") : "Select type";
					var labelEl = document.getElementById(AssociationObjectId + "typeLabel");
					if (labelEl) labelEl.textContent = labelText;
					var btnEl = document.getElementById(AssociationObjectId + "typeDropdownBtn");
					if (btnEl) btnEl.title = labelText;

					// If filtering by a specific type that this card no longer has, or converted, reload
					if (type !== "all_associations" && type !== "associate" && !filterAssociateCategory) {
						if (types.indexOf(type) === -1) {
							getAssociations();
						}
					} else if (type === "all_associations" && types.indexOf("associate") !== -1) {
						getAssociations();
					} else if (type === "associate" && types.indexOf("associate") === -1) {
						getAssociations();
					}
				},
				error: function(object, error) {
					alert("Error: " + (error.message || error.code));
				}
			});
		},
		error: function(object, error) {
			alert("Error: " + (error.message || error.code));
		}
	});
}

function addNewTypeToCard(AssociationObjectId) {
	var inputEl = document.getElementById(AssociationObjectId + "newTypeSubInput");
	if (!inputEl) return;
	var newT = inputEl.value.trim();
	if (!newT) return;
	newT = capitaliseFirstLetter(newT);
	inputEl.value = "";

	var typeQ = new Parse.Query("Type");
	typeQ.equalTo("userId", userId);
	typeQ.equalTo("type", newT);
	typeQ.first({
		success: function(existingType) {
			var applyType = function() {
				if (availableBaseTypes.indexOf(newT) === -1) {
					var aPos = availableBaseTypes.indexOf('associate');
					if (aPos !== -1) {
						availableBaseTypes.splice(aPos, 0, newT);
					} else {
						availableBaseTypes.push(newT);
					}
				}
				toggleCardType(AssociationObjectId, newT, true);
				setTypeSelect();
				getAssociations();
			};

			if (!existingType) {
				var TypeClass = Parse.Object.extend("Type");
				var tObj = new TypeClass();
				tObj.set("type", newT);
				tObj.set("userId", userId);
				tObj.save(null, {
					success: applyType,
					error: applyType
				});
			} else {
				applyType();
			}
		},
		error: function() {
			toggleCardType(AssociationObjectId, newT, true);
		}
	});
}

function changeType(AssociationObjectId) {
	var typeSelect = document.getElementById(AssociationObjectId + "changeTypeSelect");
	if (typeSelect && typeSelect.options && typeSelect.selectedIndex >= 0) {
		var newValue = typeSelect.options[typeSelect.selectedIndex].value;
		toggleCardType(AssociationObjectId, newValue, true);
	}
}

function setSort() {
	var sortSelect = document.getElementById("sortSelect");
	sort = sortSelect.options[sortSelect.selectedIndex].value;
	getAssociations();
}

function setOrder(string, bool) {
	order = string;
	
	if (string == "ascending") {
		document.getElementById("ascendingButton").style.display = "none";
		document.getElementById("descendingButton").style.display = "inline-block";
	}
	if (string == "descending") {
		document.getElementById("ascendingButton").style.display = "inline-block";
		document.getElementById("descendingButton").style.display = "none";
	}
	
	if (bool) {
		getAssociations();
	}
}

function findAssociate(string) {
	filterAssociationId = null;
	filterAssociationName = null;
	filterAssociateCategory = null;
	if (document.getElementById("nameStartsWith")) {
		document.getElementById("nameStartsWith").value = string;
	}
	getAssociates();
}

function filterAssociatesByCategory(category) {
	type = "associate";
	filterAssociateCategory = category;
	filterAssociationId = null;
	filterAssociationName = null;
	if (document.getElementById("typeSelect")) {
		$("#typeSelect").val("associate_type:" + category);
	}
	if (document.getElementById("newTypeInput")) {
		$("#newTypeInput").val("associate");
	}
	if (document.getElementById("nameStartsWith")) {
		document.getElementById("nameStartsWith").value = "";
		nameStartsWithValue = "";
	}
	if (document.getElementById("neighborhoodStartsWith")) {
		document.getElementById("neighborhoodStartsWith").value = "";
		neighborhoodStartsWithValue = "";
	}
	getAssociations();
}

function clearAssociateCategoryFilter() {
	filterAssociateCategory = null;
	filterAssociationId = null;
	filterAssociationName = null;
	type = "associate";
	if (document.getElementById("typeSelect")) {
		$("#typeSelect").val("associate");
	}
	if (document.getElementById("newTypeInput")) {
		$("#newTypeInput").val("associate");
	}
	getAssociations();
}

function filterAssociatesForAssociation(parentId, parentName) {
	filterAssociationId = parentId;
	filterAssociationName = parentName;
	filterAssociateCategory = null;
	type = "associate";
	if (document.getElementById("typeSelect")) {
		$("#typeSelect").val("associate");
	}
	if (document.getElementById("newTypeInput")) {
		$("#newTypeInput").val("associate");
	}
	if (document.getElementById("nameStartsWith")) {
		document.getElementById("nameStartsWith").value = "";
		nameStartsWithValue = "";
	}
	if (document.getElementById("neighborhoodStartsWith")) {
		document.getElementById("neighborhoodStartsWith").value = "";
		neighborhoodStartsWithValue = "";
	}
	getAssociations();
}

function clearAssociationFilter() {
	filterAssociationId = null;
	filterAssociationName = null;
	getAssociations();
}

function goToAssociation(parentId, parentType) {
	if (parentType) {
		type = parentType;
		if (document.getElementById("typeSelect")) {
			$("#typeSelect").val(parentType);
		}
		if (document.getElementById("newTypeInput")) {
			$("#newTypeInput").val(parentType);
		}
	}
	filterAssociationId = null;
	filterAssociationName = null;
	filterAssociateCategory = null;
	if (document.getElementById("nameStartsWith")) {
		document.getElementById("nameStartsWith").value = "";
		nameStartsWithValue = "";
	}
	if (document.getElementById("neighborhoodStartsWith")) {
		document.getElementById("neighborhoodStartsWith").value = "";
		neighborhoodStartsWithValue = "";
	}
	scrollToItem = '#' + parentId;
	getAssociations();
}

function setNameStartsWithValue(bool) {
	nameStartsWithValue = document.getElementById("nameStartsWith").value;
	if (bool) {
		getAssociations();
	}
}

function setNeighborhoodStartsWithValue(bool) {
	neighborhoodStartsWithValue = document.getElementById("neighborhoodStartsWith").value;
	if (bool) {
		getAssociations();
	}
}

function newAssociation(event) {
	if (event.which == 13 || event.keyCode == 13 || event == "click") {
		var Association = Parse.Object.extend("Association");
		var association = new Association();
		var name;
		var Type;
		if (document.getElementById("newNameInput").value == null || document.getElementById("newNameInput").value == "") {
			name = "";
		} else {
			name = document.getElementById("newNameInput").value;
		}
		var rawTypeInput = document.getElementById("newTypeInput").value || "misc";
		var rawTypes = rawTypeInput.split(",");
		var parsedTypes = [];
		for (var rt = 0; rt < rawTypes.length; rt++) {
			var tTrim = capitaliseFirstLetter(rawTypes[rt].trim());
			if (tTrim && parsedTypes.indexOf(tTrim) === -1) {
				parsedTypes.push(tTrim);
			}
		}
		if (parsedTypes.length === 0) parsedTypes = ["misc"];
		type = parsedTypes[0];
		$("#newNameInput").val("");
		association.set("name", name);
		association.set("type", type);
		association.set("types", parsedTypes);
		association.set("userId", userId);
		association.save(null, {
			success: function(association) {
				scrollToItem = "#" + association.id;
				var ensureTypes = function(idx) {
					if (idx >= parsedTypes.length) {
						setTypeSelect();
						getAssociations();
						return;
					}
					var curT = parsedTypes[idx];
					var query = new Parse.Query("Type");
					query.equalTo("type", curT);
					query.equalTo("userId", userId);
					query.find({
						success: function(results) {
							if (results.length === 0) {
								var Type = Parse.Object.extend("Type");
								var TypeObject = new Type();
								TypeObject.set("type", curT);
								TypeObject.set("userId", userId);
								TypeObject.save(null, {
									success: function() { ensureTypes(idx + 1); },
									error: function() { ensureTypes(idx + 1); }
								});
							} else {
								ensureTypes(idx + 1);
							}
						},
						error: function() {
							ensureTypes(idx + 1);
						}
					});
				};
				ensureTypes(0);
			},
			error: function(association, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function newAssociate(arg1, arg2) {
	var event = (arg1 === "click" || (arg1 && (arg1.keyCode || arg1.which))) ? arg1 : arg2;
	var AssociationObjectId = (event === arg1) ? arg2 : arg1;
	if (event && (event.which == 13 || event.keyCode == 13 || event == "click")) {
		var inputEl = document.getElementById('newAssociateInput' + AssociationObjectId) || document.getElementById('newNameInput' + AssociationObjectId);
		if (!inputEl) return;
		var rawName = inputEl.value;
		if (!rawName || !rawName.trim()) return;
		var name = capitaliseFirstLetter(rawName.trim());

		var query = new Parse.Query("Association");
		query.equalTo("type", "associate");
		query.equalTo("userId", userId);
		query.find({
			success: function(results) {
				var existingAssociate = null;
				for (var i = 0; i < results.length; i++) {
					if ((results[i].get('name') || '').trim().toLowerCase() === name.toLowerCase()) {
						existingAssociate = results[i];
						break;
					}
				}

				if (existingAssociate) {
					var ids = existingAssociate.get('associationIds');
					if (!Array.isArray(ids)) {
						ids = [];
					}
					var singleId = existingAssociate.get('associationId');
					if (singleId && ids.indexOf(singleId) === -1) {
						ids.push(singleId);
					}
					if (ids.indexOf(AssociationObjectId) === -1) {
						ids.push(AssociationObjectId);
					}
					existingAssociate.set('associationIds', ids);
					if (!existingAssociate.get('associationId')) {
						existingAssociate.set('associationId', AssociationObjectId);
					}
					var exTypes = existingAssociate.get('types');
					if (!Array.isArray(exTypes) || exTypes.length === 0) {
						existingAssociate.set('types', ['associate']);
					}
					existingAssociate.save(null, {
						success: function() {
							inputEl.value = '';
							getAssociations();
						},
						error: function(obj, err) {
							alert("Error saving associate: " + (err.message || err.code));
						}
					});
				} else {
					var Association = Parse.Object.extend("Association");
					var association = new Association();
					association.set("name", name);
					association.set("type", "associate");
					association.set("types", ["associate"]);
					association.set("userId", userId);
					association.set("associationId", AssociationObjectId);
					association.set("associationIds", [AssociationObjectId]);
					association.save(null, {
						success: function(newAssoc) {
							inputEl.value = '';
							var typeQuery = new Parse.Query("Type");
							typeQuery.equalTo("type", "associate");
							typeQuery.equalTo("userId", userId);
							typeQuery.find({
								success: function(typeResults) {
									if (typeResults.length === 0) {
										var Type = Parse.Object.extend("Type");
										var TypeObject = new Type();
										TypeObject.set("type", "associate");
										TypeObject.set("userId", userId);
										TypeObject.save(null, {
											success: function() {
												setTypeSelect();
											}
										});
									}
									getAssociations();
								},
								error: function() {
									getAssociations();
								}
							});
						},
						error: function(obj, err) {
							alert("Error creating associate: " + (err.message || err.code));
						}
					});
				}
			},
			error: function(err) {
				alert("Error searching associates: " + (err.message || err.code));
			}
		});
	}
}

function linkParentAssociation(arg1, arg2) {
	var event = (arg1 === "click" || (arg1 && (arg1.keyCode || arg1.which))) ? arg1 : arg2;
	var associateId = (event === arg1) ? arg2 : arg1;
	if (event && (event.which == 13 || event.keyCode == 13 || event == "click")) {
		var inputEl = document.getElementById('newParentInput' + associateId);
		if (!inputEl) return;
		var parentName = inputEl.value;
		if (!parentName || !parentName.trim()) return;
		parentName = parentName.trim();

		var query = new Parse.Query("Association");
		query.equalTo("userId", userId);
		query.notEqualTo("type", "associate");
		query.find({
			success: function(results) {
				var matchedOrg = null;
				for (var i = 0; i < results.length; i++) {
					if ((results[i].get('name') || '').trim().toLowerCase() === parentName.toLowerCase()) {
						matchedOrg = results[i];
						break;
					}
				}
				if (!matchedOrg) {
					alert("Could not find an association named '" + parentName + "'. Please check the name or create the association card first.");
					return;
				}
				var orgId = matchedOrg.id;
				var aQuery = new Parse.Query("Association");
				aQuery.get(associateId, {
					success: function(assocObj) {
						var ids = assocObj.get('associationIds');
						if (!Array.isArray(ids)) ids = [];
						var singleId = assocObj.get('associationId');
						if (singleId && ids.indexOf(singleId) === -1) ids.push(singleId);
						if (ids.indexOf(orgId) === -1) ids.push(orgId);
						assocObj.set('associationIds', ids);
						if (!assocObj.get('associationId')) assocObj.set('associationId', orgId);
						assocObj.save(null, {
							success: function() {
								inputEl.value = '';
								getAssociations();
							},
							error: function(obj, err) {
								alert("Error linking association: " + (err.message || err.code));
							}
						});
					},
					error: function(obj, err) {
						alert("Error: " + (err.message || err.code));
					}
				});
			},
			error: function(err) {
				alert("Error: " + (err.message || err.code));
			}
		});
	}
}

function unlinkAssociate(associateId, parentAssociationId, associateName) {
	var confirmation = confirm("Unlink " + (associateName || "this associate") + " from this association?");
	if (!confirmation) return;

	var Association = Parse.Object.extend("Association");
	var query = new Parse.Query(Association);
	query.get(associateId, {
		success: function(associateObj) {
			var ids = associateObj.get('associationIds');
			if (!Array.isArray(ids) || ids.length === 0) {
				var singleId = associateObj.get('associationId');
				ids = singleId ? [singleId] : [];
			}
			ids = ids.filter(function(id) {
				return id !== parentAssociationId;
			});
			associateObj.set('associationIds', ids);
			associateObj.set('associationId', ids.length > 0 ? ids[0] : null);
			associateObj.save(null, {
				success: function() {
					getAssociations();
				},
				error: function(obj, err) {
					alert("Error unlinking associate: " + (err.message || err.code));
				}
			});
		},
		error: function(obj, err) {
			alert("Error: " + (err.message || err.code));
		}
	});
}

function newNote(AssociationObjectId, event) {
	if (event.which == 13 || event.keyCode == 13 || event == "click") {
		var nameValue = document.getElementById("newNoteNameInput" + AssociationObjectId).value;
		var noteValue = document.getElementById("newNoteInput" + AssociationObjectId).value;
		var Note = Parse.Object.extend("Note");
		var note = new Note();
		var name = "";
		var divElement = "";
		var Type;	
		note.set("userId", userId);
		note.set("name", nameValue);
		note.set("note", noteValue);
		note.set("associationId", AssociationObjectId);
		note.save(null, {
			success: function(note) {
				getNotes(AssociationObjectId);
				$("#" + AssociationObjectId).find(".newNoteInput").val('');
			},
			error: function(error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function getNotes(AssociationObjectId) {
	if (document.getElementById("notes" + AssociationObjectId)) {
		setElementById("notes" + AssociationObjectId, "");
	}
	var namesArray = [];
	var notesArray = [];
	var idsArray = [];
	var notesDiv = "";
	var query = new Parse.Query("Note");
	query.ascending("name");
	query.equalTo("userId", userId);
	query.equalTo("associationId", AssociationObjectId);
	query.find({
		success: function(results) {
			for (var i = 0; i < results.length; i++) {
				var object = results[i];
				namesArray.push(object.get('name'));
				notesArray.push(object.get('note'));
				idsArray.push(object.id);
				var notesDivContent = "";
				var noteName = namesArray[i];
				var note = notesArray[i];
				var noteObjectId = idsArray[i];

				notesDivContent = notesDivContent + "<div class='row'>";

				notesDivContent = notesDivContent + "<div class='col-xs-4 col-sm-3 col-md-2 col-lg-2'>";
				notesDivContent = notesDivContent + "<input id=&apos;" + noteObjectId + "noteNameInput&apos; ";
				notesDivContent = notesDivContent + "placeholder='Note Type' onkeyup='updateNote(&apos;" + noteObjectId + "&apos;, event)' value='" + noteName + "'>";
				notesDivContent = notesDivContent + "</div>";

				notesDivContent = notesDivContent + "<div class='col-xs-6 col-sm-8 col-md-9 col-lg-9'>";
				notesDivContent = notesDivContent + "<input id=&apos;" + noteObjectId + "noteInput&apos; ";
				notesDivContent = notesDivContent + "onkeyup='updateNote(&apos;" + noteObjectId + "&apos;, event)'";
				notesDivContent = notesDivContent + "placeholder='Note' value='" + note + "'>";
				notesDivContent = notesDivContent + "</div>";

				notesDivContent = notesDivContent + "<div class='col-xs-2 col-sm-1 col-md-1 col-lg-1'>";
				notesDivContent = notesDivContent + "<button class='btn btn-danger btn-block' onclick='deleteNote(&apos;" + noteObjectId + "&apos;)'>×</button>";
				notesDivContent = notesDivContent + "</div></div>";

				if (document.getElementById("notes" + AssociationObjectId)) {					
					notesDiv = document.getElementById("notes" + AssociationObjectId).innerHTML;					
					setElementById("notes" + AssociationObjectId, notesDiv + notesDivContent);
				}
			}
		},
		error: function(error) {
			alert("Error: " + error.code + " " + error.message);
		}
	});
}

function updateNote(NoteObjectId, event) {
	if (event.which == 13 || event.keyCode == 13) {
		var nameValue = document.getElementById("'" + NoteObjectId + "noteNameInput'").value;
		var noteValue = document.getElementById("'" + NoteObjectId + "noteInput'").value;
		var Note = Parse.Object.extend("Note");
		var query = new Parse.Query(Note);
		query.get(NoteObjectId, {
			success: function(Note) {
				Note.set("name", nameValue);
				Note.set("note", noteValue);
				Note.save(null, {
					success: function(Note) {
						getAssociations();
					},
					error: function(Note, error) {
						alert("Error: " + error.code + " " + error.message);
					}
				});
			},
			error: function(object, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function deleteNote(NoteObjectId) {
	var myObject = Parse.Object.extend("Note");
	var query = new Parse.Query(myObject);
	query.get(NoteObjectId, {
	 	success: function(myObject) {
			myObject.destroy({
				success: function(myObject) {
					getAssociations();
				},
				error: function(myObject, error) {
					alert("Error: " + error.code + " " + error.message);
				}
			});
		},
		error: function(object, error) {
		}
	});
}

function deleteAssociation(AssociationObjectId) {
	var confirmation = confirm("Are you sure you want to delete this card?");	
	if (confirmation == true) {
		var myObject = Parse.Object.extend("Association");
		var query = new Parse.Query(myObject);
		query.get(AssociationObjectId, {
		 	success: function(myObject) {
				myObject.destroy({
					success: function(myObject) {
						getAssociations();
					},
					error: function(myObject, error) {
						alert("Error: " + error.code + " " + error.message);
					}
				});
			},
			error: function(object, error) {
			}
		});
	}
}

function deleteType(AssociationObjectId) {
	var myObject = Parse.Object.extend("Type");
	var query = new Parse.Query(myObject);
	query.get(AssociationObjectId, {
	 	success: function(myObject) {
			myObject.destroy({
				success: function(myObject) {
					$("#checkNamesDiv").hide();
					setTypeSelect();
				},
				error: function(myObject, error) {
					alert("Error: " + error.code + " " + error.message);
				}
			});
		},
		error: function(object, error) {
		}
	});
}

function updateSite(AssociationObjectId, event) {
	if (event.which == 13 || event.keyCode == 13 || event == "focusout") {
		var newValue = document.getElementById(AssociationObjectId + "siteInput").value;
		var Association = Parse.Object.extend("Association");
		var query = new Parse.Query(Association);
		query.get(AssociationObjectId, {
			success: function(Association) {
				if (newValue == "") {
					Association.unset("site");
				} else {
					if (!newValue.match(/^[a-zA-Z]+:\/\//)) {
						newValue = 'http://' + newValue;
					}
					Association.set("site", newValue);
				}
				Association.save(null, {
					success: function(Association) {
						getAssociations();
					},
					error: function(Association, error) {
						alert("Error: " + error.code + " " + error.message);
					}
				});
			},
			error: function(object, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function updateFb(AssociationObjectId, event) {
	if (event.which == 13 || event.keyCode == 13 || event == "focusout") {
		var newValue = document.getElementById(AssociationObjectId + "fbInput").value;
		var Association = Parse.Object.extend("Association");
		var query = new Parse.Query(Association);
		query.get(AssociationObjectId, {
			success: function(Association) {
				if (newValue == "") {
					Association.unset("fb");
				} else {
					if (!newValue.match(/^[a-zA-Z]+:\/\//)) {
						newValue = 'http://' + newValue;
					}
					Association.set("fb", newValue);
				}
				Association.save(null, {
					success: function(Association) {
						getAssociations();
					},
					error: function(Association, error) {
						alert("Error: " + error.code + " " + error.message);
					}
				});
			},
			error: function(object, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function updateIg(AssociationObjectId, event) {
	if (event.which == 13 || event.keyCode == 13 || event == "focusout") {
		var newValue = document.getElementById(AssociationObjectId + "igInput").value;
		var Association = Parse.Object.extend("Association");
		var query = new Parse.Query(Association);
		query.get(AssociationObjectId, {
			success: function(Association) {
				if (newValue == "") {
					Association.unset("ig");
				} else {
					if (!newValue.match(/^[a-zA-Z]+:\/\//)) {
						newValue = 'http://' + newValue;
					}
					Association.set("ig", newValue);
				}
				Association.save(null, {
					success: function(Association) {
						getAssociations();
					},
					error: function(Association, error) {
						alert("Error: " + error.code + " " + error.message);
					}
				});
			},
			error: function(object, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function updateTwitter(AssociationObjectId, event) {
	if (event.which == 13 || event.keyCode == 13 || event == "focusout") {
		var newValue = document.getElementById(AssociationObjectId + "twitterInput").value;
		var Association = Parse.Object.extend("Association");
		var query = new Parse.Query(Association);
		query.get(AssociationObjectId, {
			success: function(Association) {
				if (newValue == "") {
					Association.unset("twitter");
					Association.unset("x");
				} else {
					if (!newValue.match(/^[a-zA-Z]+:\/\//)) {
						newValue = 'https://' + newValue;
					}
					Association.set("twitter", newValue);
					Association.set("x", newValue);
				}
				Association.save(null, {
					success: function(Association) {
						getAssociations();
					},
					error: function(Association, error) {
						alert("Error: " + error.code + " " + error.message);
					}
				});
			},
			error: function(object, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function updateName(AssociationObjectId, event) {
	if (event.which == 13 || event.keyCode == 13) {
		var newValue = document.getElementById(AssociationObjectId + "nameInput").value;
		var Association = Parse.Object.extend("Association");
		var query = new Parse.Query(Association);
		query.get(AssociationObjectId, {
			success: function(Association) {
				Association.set("name", newValue);
				if (newValue == "") {
					Association.unset("name");
				}
				Association.save(null, {
					success: function(Association) {
						getAssociations();
					},
					error: function(Association, error) {
						alert("Error: " + error.code + " " + error.message);
					}
				});
			},
			error: function(object, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function updateRating(AssociationObjectId) {
	var newValue = parseInt(document.getElementById(AssociationObjectId + "ratingInput").value);
	var Association = Parse.Object.extend("Association");
	var query = new Parse.Query(Association);
	query.get(AssociationObjectId, {
		success: function(Association) {
			Association.set("rating", newValue);
			if (newValue == "") {
				Association.unset("rating");
			}
			Association.save(null, {
				success: function(Association) {
					getAssociations();
				},
				error: function(Association, error) {
					alert("Error: " + error.code + " " + error.message);
				}
			});
		},
		error: function(object, error) {
			alert("Error: " + error.code + " " + error.message);
		}
	});
}

function updateLocation(AssociationObjectId, event) {
	if (event.which == 13 || event.keyCode == 13 || event == "focusout") {
		var address = document.getElementById(AssociationObjectId + "locationInput").value;
		if (!address) return;

		var applyLocation = function(lat, lng, formattedAddress, neighborhoodName) {
			var geoValue = new Parse.GeoPoint({latitude: lat, longitude: lng});
			var Association = Parse.Object.extend("Association");
			var query = new Parse.Query(Association);
			query.get(AssociationObjectId, {
				success: function(Association) {
					Association.set("geo", geoValue);
					Association.set("neighborhood", neighborhoodName || "-");
					Association.set("location", formattedAddress || address);
					Association.save(null, {
						success: function() {
							getAssociations();
						},
						error: function(assoc, error) {
							alert("Error saving location: " + (error.message || error.code));
						}
					});
				},
				error: function(object, error) {
					alert("Error finding card: " + (error.message || error.code));
				}
			});
		};

		freeGeocodeAddress(address, function(res) {
			if (res && res.success) {
				applyLocation(res.latitude, res.longitude, res.formatted_address, res.neighborhood);
			} else {
				var fallbackLat = (typeof currentLocationPointLatitude !== 'undefined' && currentLocationPointLatitude !== null) ? currentLocationPointLatitude : 37.7749;
				var fallbackLng = (typeof currentLocationPointLongitude !== 'undefined' && currentLocationPointLongitude !== null) ? currentLocationPointLongitude : -122.4194;
				applyLocation(fallbackLat, fallbackLng, address, address.split(',')[0].trim());
			}
		});
	}
}

function getAssociates() {
	type = "associate";
	filterAssociateCategory = null;
	filterAssociationId = null;
	filterAssociationName = null;
	if (document.getElementById("typeSelect")) {
		$("#typeSelect").val("associate");
	}
	if (document.getElementById("newTypeInput")) {
		$("#newTypeInput").val("associate");
	}
	getAssociations();
}

function getAssociations() {
	setNameStartsWithValue();
	setNeighborhoodStartsWithValue();
	var idsArray = [];
	var namesArray = [];
	var typesArray = [];
	var sitesArray = [];
	var fbArray = [];
	var igArray = [];
	var twitterArray = [];
	var ratingArray = [];
	var locationArray = [];
	var geoArray = [];
	var neighborhoodArray = [];
	var distanceArray = [];
	var query = new Parse.Query("Association");
	if (type === "all_associations") {
		query.notEqualTo("type", "associate");
	} else {
		query.equalTo("type", type);
	}
	if (type === "associate" && filterAssociationId) {
		query.equalTo("associationId", filterAssociationId);
	}
	if (nameStartsWithValue != null && nameStartsWithValue !== "") {
		query.matches("name", "(" + capitaliseFirstLetter(nameStartsWithValue) + "|" + nameStartsWithValue.toLowerCase() + ")" + ".*");
	}
	if (neighborhoodStartsWithValue != null && neighborhoodStartsWithValue !== "" && neighborhoodStartsWithValue !== "(undefined)") {
		query.matches("neighborhood", "(" + capitaliseFirstLetter(neighborhoodStartsWithValue) + "|" + neighborhoodStartsWithValue.toLowerCase() + ")" + ".*");
	}	
	if (sort != null && sort !== "") {
		if (order != null && order !== "") {
			if (sort == "distance") {
				var point = currentLocationPoint || (new Parse.GeoPoint({latitude: currentLocationPointLatitude, longitude: currentLocationPointLongitude}));
				query.near("geo", point);
				if (order == "descending") {
					query.descending("distance");
				} else {
					query.ascending("distance");
				}
			} else {
				if (order == "descending") {
					query.descending(sort);
				} else {
					query.ascending(sort);
				}
			}
		}
	} else {
		if (order != null && order !== "") {
			if (order == "descending") {
				query.descending("name");
			} else {
				query.ascending("name");
			}
		}
	}
	query.equalTo("userId", userId);
	query.find({
	success: function(rawResults) {
		var processResults = function(results) {
		for (var i = 0; i < results.length; i++) {
			var object = results[i];
			idsArray.push(object.id);
			namesArray.push(object.get('name'));
			var objTypes = object.get('types');
			if (!Array.isArray(objTypes) || objTypes.length === 0) {
				var legacyT = object.get('type');
				objTypes = legacyT ? [legacyT] : [];
			}
			typesArray.push(objTypes);
			sitesArray.push(object.get('site'));
			fbArray.push(object.get('fb'));
			igArray.push(object.get('ig'));
			twitterArray.push(object.get('x') || object.get('twitter'));
			ratingArray.push(object.get('rating'));
			locationArray.push(object.get('location'));
			geoArray.push(object.get('geo'));
			neighborhoodArray.push(object.get('neighborhood'));
		}
		output = ""
		for (var j = 0; j < namesArray.length; j++) {
			var listItemId = "";
			var listItemName = "";
			var listItemType = "";
			var listItemTypes = typesArray[j] || [];
			var listItemLocation = "";
			listItemId = idsArray[j];
			listItemName = namesArray[j];
			listItemType = listItemTypes.length > 0 ? listItemTypes[0] : "";
			listItemLocation = locationArray[j];
			if (listItemLocation == "undefined" || listItemLocation == undefined) {
				listItemLocation = "";
			}
			listItemLocation = cleanRawAddress(listItemLocation);
			var listItemGeo = "";
			var listItemLatitude = 122.4167;
			var listItemLongitude = 37.7833;
			
			if (geoArray[j] != undefined) {
				listItemLatitude = (Math.round(geoArray[j].latitude * 1000) / 1000);
				listItemLongitude = (Math.round(geoArray[j].longitude * 1000) / 1000);
				var lat1 = currentLocationPointLatitude;
				var lon1 = currentLocationPointLongitude;
				var lat2 = listItemLatitude;
				var lon2 = listItemLongitude;
				var dLat = (lat2 - lat1) * Math.PI / 180;
				var dLon = (lon2 - lon1) * Math.PI / 180;
				var aDist = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
				            Math.sin(dLon / 2) * Math.sin(dLon / 2);
				var cDist = 2 * Math.atan2(Math.sqrt(aDist), Math.sqrt(1 - aDist));
				var distance = Math.round(3958.8 * cDist * 10) / 10;
				distanceArray.push(distance);
				listItemGeo = distance;
				if (listItemGeo >= 0) {
				} else {					
					listItemGeo = "-";
				}
			} else {
				listItemGeo = "-";
			}

			var listItemNeighborhood = "";
			listItemNeighborhood = neighborhoodArray[j];

			if (listItemNeighborhood == "undefined" || listItemNeighborhood == undefined) {
				listItemNeighborhood = "-";
			}
			var listItemRating = ratingArray[j];
			var listItemRatingColor = "";

			var listItemSite = "";
			var siteDisplay = "";
			var listItemFb = "";
			var fbDisplay = "";
			var listItemTwitter = "";
			var twitterDisplay = "";
			var siteBlankDisplay = "";
			var fbBlankDisplay = "";
			var igBlankDisplay = "";
			var twitterBlankDisplay = "";

			if (sitesArray[j] != undefined) {
				listItemSite = sitesArray[j];
				siteDisplay = "";
				siteBlankDisplay = "style='display:none;'";
			} else {
				listItemSite = "";
				siteDisplay = "style='display:none;'";
			}
			if (fbArray[j] != undefined) {
				listItemFb = fbArray[j];
				fbDisplay = "";
				fbBlankDisplay = "style='display:none;'";
			} else {
				listItemFb = "";
				fbDisplay = "style='display:none;'";
			}
			if (igArray[j] != undefined) {
				listItemIg = igArray[j];
				igDisplay = "";
				igBlankDisplay = "style='display:none;'";
			} else {
				listItemIg = "";
				igDisplay = "style='display:none;'";
			}
			if (twitterArray[j] != undefined) {
				listItemTwitter = twitterArray[j];
				twitterDisplay = "";
				twitterBlankDisplay = "style='display:none;'";
			} else {
				listItemTwitter = "";
				twitterDisplay = "style='display:none;'";
			}
			if (listItemRating > 90) {
				listItemRatingColor = "#6f6";
			} if (listItemRating <= 90) {
				listItemRatingColor = "#7f6";
			} if (listItemRating < 80) {
				listItemRatingColor = "#8e6";
			} if (listItemRating < 70) {
				listItemRatingColor = "#9e6";
			} if (listItemRating < 60) {
				listItemRatingColor = "#ad6";
			} if (listItemRating < 50) {
				listItemRatingColor = "#bd6";
			} if (listItemRating < 40) {
				listItemRatingColor = "#cc6";
			} if (listItemRating < 30) {
				listItemRatingColor = "#dc6";
			} if (listItemRating < 20) {
				listItemRatingColor = "#eb6";
			} if (listItemRating < 10) {
				listItemRatingColor = "#fb6";
			} if (listItemRating == 0 || listItemRating == undefined) {
				listItemRatingColor = "#fec";
			}
			var doubleDigitNumber = ((1)+(j));
			if (doubleDigitNumber < 10 && doubleDigitNumber >= 0) {
				doubleDigitNumber =  "0" + doubleDigitNumber;
			}
			output = output + "<div class='well card' id='" + listItemId + "'>";

			output = output + "<div class='row'>";

			output = output + "<div class='col-xs-2 col-sm-2 col-md-1 col-lg-1 float-left'>";
			output = output + "<div class='display-card title-column btn-default'>▼</div></div>";

			output = output + "<div class='col-xs-8 col-sm-1 col-md-1 col-lg-1 float-left'><div class='title-column'>" + doubleDigitNumber + "</div></div>";
			
			output = output + "<div class='col-xs-10 col-sm-6 col-md-7 col-lg-7 float-left'>";
			output = output + "<input class='title title-column' placeholder='Name' type='text' id='" + listItemId + "nameInput' onkeyup='updateName(&apos;" + listItemId + "&apos;, event)' value='" + listItemName + "'>";

			output = output + "</div><div class='col-xs-2 col-sm-3 col-md-3 col-lg-3 float-right'>";
			output = output + "<button class='title-column btn-danger btn-block' onclick='deleteAssociation(&apos;" + listItemId + "&apos;)'><span class='hidden-xs'>delete card</span> ×</button>";
			output = output + "</div></div>";

			output = output + "<div class='toggle-display-card'>";

			output = output + "<div class='row'>";

			output = output + "<div class='col-xs-6 col-sm-6 col-md-6 col-lg-7'>";
			output = output + "<span class='rating'>";
			output = output + "<input style='background:" + listItemRatingColor + ";' placeholder='my rating (1-100)' type='number' min='0' max='100' step='5' id='" + listItemId + "ratingInput' onchange='updateRating(&apos;" + listItemId + "&apos;)' value='" + listItemRating + "'>";
			output = output + "</span></div>";

			output = output + "<div class='col-xs-6 col-sm-6 col-md-6 col-lg-5 text-right'>";
			var displayLabel = listItemTypes.length > 0 ? listItemTypes.join(", ") : "Select type";
			var displayTooltip = escapeHtml(listItemTypes.join(", "));
			output = output + "<div class='dropdown' id='" + listItemId + "typeDropdown' style='margin-bottom: 10px; display:inline-block; max-width:100%;'>";
			output = output + "<button class='btn btn-default btn-sm dropdown-toggle' type='button' id='" + listItemId + "typeDropdownBtn' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false' style='max-width:240px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;' title='" + displayTooltip + "'>";
			output = output + "<span id='" + listItemId + "typeLabel'>" + escapeHtml(displayLabel) + "</span> <span class='caret'></span>";
			output = output + "</button>";
			output = output + "<ul class='dropdown-menu dropdown-menu-right' aria-labelledby='" + listItemId + "typeDropdownBtn' style='padding: 8px 12px; min-width: 220px; max-height: 280px; overflow-y: auto; text-align: left;' onclick='event.stopPropagation();'>";
			output = output + "<li class='dropdown-header' style='padding: 2px 0 6px 0; font-weight: bold; color: #555;'>Card Types (select multiple)</li>";
			for (var bt = 0; bt < availableBaseTypes.length; bt++) {
				var bType = availableBaseTypes[bt];
				var isChecked = listItemTypes.indexOf(bType) !== -1 ? "checked" : "";
				output = output + "<li style='margin: 4px 0;'>";
				output = output + "<label style='font-weight: normal; cursor: pointer; display: block; margin: 0;'>";
				output = output + "<input type='checkbox' value='" + escapeHtml(bType) + "' " + isChecked + " onchange='toggleCardType(&apos;" + listItemId + "&apos;, &apos;" + escapeJsString(bType) + "&apos;, this.checked)'> ";
				output = output + escapeHtml(bType);
				output = output + "</label></li>";
			}
			output = output + "<li class='divider' style='margin: 6px 0;'></li>";
			output = output + "<li><div class='input-group input-group-sm'>";
			output = output + "<input type='text' class='form-control' placeholder='New type...' id='" + listItemId + "newTypeSubInput' onkeydown='if(event.keyCode===13){event.preventDefault();addNewTypeToCard(&apos;" + listItemId + "&apos;);}'>";
			output = output + "<span class='input-group-btn'>";
			output = output + "<button class='btn btn-primary' type='button' title='Add new type' onclick='addNewTypeToCard(&apos;" + listItemId + "&apos;)'>+</button>";
			output = output + "</span></div></li>";
			output = output + "</ul></div></div></div>";

			output = output + "<div id='accordion-" + listItemId + "' role='tablist' aria-multiselectable='true'><h2><div data-toggle='collapse' data-parent='#accordion-" + listItemId + "' href='#collapse" + listItemId + "Location' aria-expanded='true' aria-controls='collapse" + listItemId + "Location' class='collapsed'>";
			output = output + "<i class='glyphicon glyphicon-map-marker'></i> Location<i class='float-left glyphicon glyphicon-collapse-down toggleCollapseGlyphicon'></i></div></h2>";
			output = output + "<div id='collapse" + listItemId + "Location' class='panel-collapse collapse in' role='tabpanel' aria-labelledby='headingOne'>";

			output = output + "<div class='row'>";

			output = output + "<div class='col-xs-12 col-sm-6 col-md-6 col-lg-7'>";

			output = output + "<input class='locationInput' placeholder='location (example: 3101 24th Street, San Francisco, CA)' type='text' id='" + listItemId + "locationInput' onkeyup='updateLocation(&apos;" + listItemId + "&apos;, event)' value='" + listItemLocation + "'>";
			if (listItemLocation && listItemLocation.trim() !== "") {
				var mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(listItemLocation);
				output = output + "<div><a href='" + mapsUrl + "' target='_blank' rel='noopener noreferrer' class='btn btn-google-maps' id='" + listItemId + "mapsLink'><i class='glyphicon glyphicon-map-marker'></i> Google Maps <i class='glyphicon glyphicon-new-window' style='font-size:9px;'></i></a></div>";
			}
			output = output + "</div>";

			output = output + "<div class='col-xs-12 col-sm-6 col-md-4 col-lg-3'>";
			output = output + "<p>" + listItemNeighborhood + "</p>";
			output = output + "</div>";
			output = output + "<div class='hidden-xs hidden-sm col-md-2 col-lg-2'>";
			output = output + "<p>" + (listItemGeo !== "-" ? (listItemGeo + " mi") : "-") + "</p>";
			output = output + "</div></div></div>";

			output = output + "<h2><div data-toggle='collapse' data-parent='#accordion-" + listItemId + "' href='#collapse" + listItemId + "Links' aria-expanded='true' aria-controls='collapse" + listItemId + "Links' class='collapsed'>";
			output = output + "<i class='glyphicon glyphicon-link'></i> Links<i class='float-left glyphicon glyphicon-collapse-down toggleCollapseGlyphicon'></i></div></h2>";
			output = output + "<div id='collapse" + listItemId + "Links' class='panel-collapse collapse in' role='tabpanel' aria-labelledby='headingOne'>";

			output = output + "<div class'row'>";
            output = output + "<div class='btn-padding btn-group btn-group-justified' role='group'>";
            output = output + "<div class='btn-group' role='group'>";
			output = output + "<button class='btn btn-default btn-site' " + siteDisplay + " onclick='visit(&apos;" + listItemSite + "&apos;)'>web <i class='glyphicon glyphicon-new-window'></i></button>";
            output = output + "</div><div class='btn-group' role='group'>";
			output = output + "<button class='btn btn-default btn-fb' " + fbDisplay + " onclick='visit(&apos;" + listItemFb + "&apos;)'>fb <i class='glyphicon glyphicon-new-window'></i></button>";
            output = output + "</div><div class='btn-group' role='group'>";
			output = output + "<button class='btn btn-default btn-ig' " + igDisplay + " onclick='visit(&apos;" + listItemIg + "&apos;)'>insta <i class='glyphicon glyphicon-new-window'></i></button>";
            output = output + "</div><div class='btn-group' role='group'>";
			output = output + "<button class='btn btn-default btn-twitter btn-x' " + twitterDisplay + " onclick='visit(&apos;" + listItemTwitter + "&apos;)'>x <i class='glyphicon glyphicon-new-window'></i></button>";
			output = output + "</div></div></div>";

			output = output + "<div class'row'>";

            output = output + "<div class='btn-padding btn-group btn-group-justified' role='group'>";

            output = output + "<div class='btn-group' role='group'>";
			output = output + "<input class='site corners-right' placeholder='www (url)' type='text' id='" + listItemId + "siteInput' onkeyup='updateSite(&apos;" + listItemId + "&apos;, event)' value='" + listItemSite + "'>";
			output = output + "</div>";

            output = output + "<div class='btn-group' role='group'>";
			output = output + "<input class='fb corners' placeholder='fb (url)' type='text' id='" + listItemId + "fbInput' onkeyup='updateFb(&apos;" + listItemId + "&apos;, event)' value='" + listItemFb + "'>";
			output = output + "</div>";

            output = output + "<div class='btn-group' role='group'>";
			output = output + "<input class='ig corners' placeholder='insta (url)' type='text' id='" + listItemId + "igInput' onkeyup='updateIg(&apos;" + listItemId + "&apos;, event)' value='" + listItemIg + "'>";
			output = output + "</div>";

            output = output + "<div class='btn-group' role='group'>";
			output = output + "<input class='twitter x corners-left' placeholder='x (url)' type='text' id='" + listItemId + "twitterInput' onkeyup='updateTwitter(&apos;" + listItemId + "&apos;, event)' value='" + listItemTwitter + "'>";
			output = output + "</div></div></div></div>";

			output = output + "<div></div><div class'row'>";

			output = output + "<div class='clearfix'></div>";

			if (listItemTypes.indexOf('associate') !== -1) {
				output = output + "<h2><div data-toggle='collapse' data-parent='#accordion-" + listItemId + "' href='#collapse" + listItemId + "ParentAssoc' aria-expanded='true' aria-controls='collapse" + listItemId + "ParentAssoc' class='collapsed'>";
				output = output + "<i class='glyphicon glyphicon-briefcase'></i> Associated With<i class='float-left glyphicon glyphicon-collapse-down toggleCollapseGlyphicon'></i></div></h2>";
				output = output + "<div id='collapse" + listItemId + "ParentAssoc' class='panel-collapse collapse in' role='tabpanel'>";
				output = output + "<div class='row'><div class='col-xs-12 col-sm-12 col-md-12 col-lg-12'><div id='parentAssoc" + listItemId + "'></div></div></div>";
				output = output + "<div class='row'><div class='col-xs-10 col-sm-11 col-md-11 col-lg-11'>";
				output = output + "<input placeholder='Link to association (example: Dolores Park Church)' type='text' id='newParentInput" + listItemId + "' onkeyup='linkParentAssociation(&apos;" + listItemId + "&apos;, event)' value=''>";
				output = output + "</div><div class='col-xs-2 col-sm-1 col-md-1 col-lg-1'>";
				output = output + "<button class='linkParent btn btn-primary btn-block'>+</button>";
				output = output + "</div></div></div>";
			} else {
				output = output + "<h2><div data-toggle='collapse' data-parent='#accordion-" + listItemId + "' href='#collapse" + listItemId + "Associates' aria-expanded='true' aria-controls='collapse" + listItemId + "Associates' class='collapsed'>";
				output = output + "<i class='glyphicon glyphicon-user'></i> Associates<i class='float-left glyphicon glyphicon-collapse-down toggleCollapseGlyphicon'></i></div></h2>";
				output = output + "<div id='collapse" + listItemId + "Associates' class='panel-collapse collapse in' role='tabpanel' aria-labelledby='headingOne'>";
				output = output + "<div class='row'><div class='col-xs-12 col-sm-12 col-md-12 col-lg-12'>";
				output = output + "<div style='margin-bottom: 6px; text-align: left;'>";
				output = output + "<button class='btn btn-xs btn-default' onclick='filterAssociatesForAssociation(&apos;" + listItemId + "&apos;, &apos;" + escapeJsString(listItemName) + "&apos;)'>";
				output = output + "<i class='glyphicon glyphicon-filter'></i> view all associates for this association</button>";
				for (var ct = 0; ct < listItemTypes.length; ct++) {
					var cType = listItemTypes[ct];
					if (cType && cType !== 'associate') {
						output = output + "<button class='btn btn-xs btn-default' style='margin-left:5px; margin-top:2px;' onclick='filterAssociatesByCategory(&apos;" + escapeJsString(cType) + "&apos;)'>";
						output = output + "<i class='glyphicon glyphicon-filter'></i> view all " + escapeHtml(cType) + " associates</button>";
					}
				}
				output = output + "</div>";
				output = output + "<div id='associate" + listItemId + "'></div>";
				output = output + "</div></div>";
				output = output + "<div class='row'><div class='col-xs-10 col-sm-11 col-md-11 col-lg-11'>";
				output = output + "<input placeholder='Add associate (example: Daniel Goodwyn)' type='text' id='newAssociateInput" + listItemId + "' onkeyup='newAssociate(event, &apos;" + listItemId + "&apos;)' value=''>";
				output = output + "</div><div class='col-xs-2 col-sm-1 col-md-1 col-lg-1'>";
				output = output + "<button class='newAssociate btn btn-primary btn-block' title='Add associate'>+</button>";
				output = output + "</div></div></div></div>";
			}

			output = output + "<div class='clearfix'></div>";

			output = output + "<h2><div data-toggle='collapse' data-parent='#accordion-" + listItemId + "' href='#collapse" + listItemId + "Notes' aria-expanded='true' aria-controls='collapse" + listItemId + "Notes' class='collapsed'>";
			output = output + "<i class='glyphicon glyphicon-pencil'></i> Notes<i class='float-left glyphicon glyphicon-collapse-down toggleCollapseGlyphicon'></i></div></h2>";
			output = output + "<div id='collapse" + listItemId + "Notes' class='panel-collapse collapse in' role='tabpanel' aria-labelledby='headingOne'>";

			output = output + "<div id='notes" + listItemId + "'></div>";

			output = output + "<div><div class='row'>";

			output = output + "<div class='col-xs-4 col-sm-3 col-md-2 col-lg-2'>";
			output = output + "<input id='newNoteNameInput" + listItemId + "' onkeyup='newNote(&apos;" + listItemId + "&apos;, event)' placeholder='Note Type (optional)'>";
			output = output + "</div>";

			output = output + "<div class='col-xs-6 col-sm-8 col-md-9 col-lg-9'>";
			output = output + "<input class='newNoteInput' id='newNoteInput" + listItemId + "' onkeyup='newNote(&apos;" + listItemId + "&apos;, event)' placeholder='New Note'>";
			output = output + "</div>";

			output = output + "<div class='col-xs-2 col-sm-1 col-md-1 col-lg-1'>";
			output = output + "<button class='newNote btn btn-primary btn-block'>+</button>";
			output = output + "</div></div></div></div></div>";

			output = output + "<div class='clearfix'></div></div></div></div></div>";

		}
		setElementById("output", output);		
		checkNames();
		scrollTo(scrollToItem);
		scrollToItem = "";

		// Load notes for every card rendered on this page
		for (var k = 0; k < idsArray.length; k++) {
			getNotes(idsArray[k]);
		}

		// Query all non-associate associations to build lookup map & autocomplete
		var orgQuery = new Parse.Query("Association");
		orgQuery.equalTo("userId", userId);
		orgQuery.notEqualTo("type", "associate");
		orgQuery.ascending("name");
		orgQuery.find({
			success: function(orgResults) {
				var orgMap = {};
				var orgNames = [];
				for (var o = 0; o < orgResults.length; o++) {
					var orgObj = orgResults[o];
					orgMap[orgObj.id] = {
						id: orgObj.id,
						name: orgObj.get('name'),
						type: orgObj.get('type'),
						types: orgObj.get('types') || (orgObj.get('type') ? [orgObj.get('type')] : [])
					};
					if (orgObj.get('name')) {
						orgNames.push(orgObj.get('name'));
					}
				}

				// Enable autocomplete for link parent inputs
				try {
					$("[id^='newParentInput']").autocomplete({
						source: orgNames,
						select: function(e, ui) {
							$(this).val(ui.item.value);
						}
					});
				} catch (e) {}

				// Query all associates
				var assocQuery = new Parse.Query("Association");
				assocQuery.equalTo("type", "associate");
				assocQuery.equalTo("userId", userId);
				assocQuery.ascending("name");
				assocQuery.find({
					success: function(assocResults) {
						var assocHtmlMap = {};
						var parentAssocHtmlMap = {};
						var associateNames = [];

						for (var a = 0; a < assocResults.length; a++) {
							var aObj = assocResults[a];
							var aId = aObj.id;
							var aName = aObj.get('name');
							if (aName && associateNames.indexOf(aName) === -1) {
								associateNames.push(aName);
							}
							var parentIds = aObj.get('associationIds');
							if (!Array.isArray(parentIds) || parentIds.length === 0) {
								var singlePId = aObj.get('associationId');
								parentIds = singlePId ? [singlePId] : [];
							}

							// Deduplicate parentIds
							var uniqueParentIds = [];
							for (var up = 0; up < parentIds.length; up++) {
								if (parentIds[up] && uniqueParentIds.indexOf(parentIds[up]) === -1) {
									uniqueParentIds.push(parentIds[up]);
								}
							}

							// 1. Populate associate buttons for parent association cards
							for (var p = 0; p < uniqueParentIds.length; p++) {
								var pid = uniqueParentIds[p];
								var aBtn = "<div class='btn-padding float-left'>" +
									"<div class='btn-group' role='group'>" +
									"<button class='btn btn-default' onclick='findAssociate(&apos;" + escapeJsString(aName) + "&apos;)'>" + escapeHtml(aName) + "</button>" +
									"<button class='btn btn-danger' title='Unlink associate' onclick='unlinkAssociate(&apos;" + aId + "&apos;, &apos;" + pid + "&apos;, &apos;" + escapeJsString(aName) + "&apos;)'>×</button>" +
									"</div></div>";
								assocHtmlMap[pid] = (assocHtmlMap[pid] || "") + aBtn;
							}

							// 2. Populate parent association buttons for associate cards
							var parentHtml = "";
							for (var pi = 0; pi < uniqueParentIds.length; pi++) {
								var pOrgId = uniqueParentIds[pi];
								var pOrg = orgMap[pOrgId];
								var pOrgName = pOrg ? pOrg.name : ("Association #" + pOrgId.substring(0, 5));
								var pOrgType = (pOrg && pOrg.types && pOrg.types.length > 0) ? pOrg.types[0] : (pOrg ? pOrg.type : "");
								parentHtml += "<div class='btn-padding float-left'>" +
									"<div class='btn-group' role='group'>" +
									"<button class='btn btn-info' onclick='goToAssociation(&apos;" + pOrgId + "&apos;, &apos;" + escapeJsString(pOrgType) + "&apos;)'>" +
									"<i class='glyphicon glyphicon-briefcase'></i> " + escapeHtml(pOrgName) + "</button>" +
									"<button class='btn btn-danger' title='Unlink association' onclick='unlinkAssociate(&apos;" + aId + "&apos;, &apos;" + pOrgId + "&apos;, &apos;" + escapeJsString(aName) + "&apos;)'>×</button>" +
									"</div></div>";
							}
							if (parentHtml === "") {
								parentHtml = "<p class='text-muted' style='margin-bottom:8px;'><i>Not linked to any association yet.</i></p>";
							}
							parentAssocHtmlMap[aId] = parentHtml;
						}

						// Apply to DOM
						for (var orgKey in orgMap) {
							var orgEl = document.getElementById("associate" + orgKey);
							if (orgEl) {
								orgEl.innerHTML = assocHtmlMap[orgKey] || "";
							}
						}
						for (var asKey in parentAssocHtmlMap) {
							var asEl = document.getElementById("parentAssoc" + asKey);
							if (asEl) {
								asEl.innerHTML = parentAssocHtmlMap[asKey];
							}
						}

						// Enable autocomplete for new associate inputs
						try {
							$("[id^='newAssociateInput'], [id^='newNameInput'][id!='newNameInput']").autocomplete({
								source: associateNames,
								select: function(e, ui) {
									$(this).val(ui.item.value);
								}
							});
						} catch (e) {}
					},
					error: function(err) {
						console.error("Error loading associates:", err);
					}
				});
			},
			error: function(err) {
				console.error("Error loading associations:", err);
			}
		});
		};

		if (type === "associate" && filterAssociateCategory) {
			var orgQ = new Parse.Query("Association");
			orgQ.equalTo("userId", userId);
			orgQ.equalTo("type", filterAssociateCategory);
			orgQ.find({
				success: function(matchingOrgs) {
					var validOrgIds = matchingOrgs.map(function(o) { return o.id; });
					var filtered = rawResults.filter(function(assoc) {
						var ids = assoc.get('associationIds');
						if (!Array.isArray(ids) || ids.length === 0) {
							var singleId = assoc.get('associationId');
							ids = singleId ? [singleId] : [];
						}
						for (var m = 0; m < ids.length; m++) {
							if (validOrgIds.indexOf(ids[m]) !== -1) return true;
						}
						return false;
					});
					processResults(filtered);
				},
				error: function() {
					processResults(rawResults);
				}
			});
		} else {
			processResults(rawResults);
		}
	},
	error: function(error) {
		alert("Error: " + (error.message || error.code));
	}
	});
}

function checkNames() {
	var checkNamesDiv = "";
	var typeId;

	if (filterAssociationId && filterAssociationName) {
		checkNamesDiv = "<div><span class='label label-info' style='font-size:13px; padding: 5px 10px; display:inline-block; border-radius:12px;'>" +
			"<i class='glyphicon glyphicon-filter'></i> associates of <b>" + escapeHtml(filterAssociationName) + "</b> " +
			"<a href='javascript:void(0)' onclick='clearAssociationFilter()' style='color:#fff; text-decoration:none; font-weight:bold; margin-left:8px; cursor:pointer;' title='Clear filter'>×</a>" +
			"</span></div>";
		setElementById("checkNamesDiv", checkNamesDiv);
		return;
	}

	if (filterAssociateCategory) {
		checkNamesDiv = "<div><span class='label label-info' style='font-size:13px; padding: 5px 10px; display:inline-block; border-radius:12px;'>" +
			"<i class='glyphicon glyphicon-filter'></i> <b>" + escapeHtml(filterAssociateCategory) + "</b> associates " +
			"<a href='javascript:void(0)' onclick='clearAssociateCategoryFilter()' style='color:#fff; text-decoration:none; font-weight:bold; margin-left:8px; cursor:pointer;' title='Show all associates'>×</a>" +
			"</span></div>";
		setElementById("checkNamesDiv", checkNamesDiv);
		return;
	}

	if (type === "all_associations") {
		checkNamesDiv = "<div><i class='glyphicon glyphicon-filter'></i> all associations</div>";
		setElementById("checkNamesDiv", checkNamesDiv);
		return;
	}

	if (type === "associate") {
		checkNamesDiv = "<div><i class='glyphicon glyphicon-filter'></i> all associates</div>";
		setElementById("checkNamesDiv", checkNamesDiv);
		return;
	}

	var typeQuery = new Parse.Query("Type");
	typeQuery.equalTo("type", type);
	if (typeof userId !== 'undefined' && userId) {
		typeQuery.equalTo("userId", userId);
	}
	typeQuery.find({
		success: function(results) {
			checkNamesDiv = "<div><i class='glyphicon glyphicon-filter'></i> " + type + "</div>";
			if (results && results.length > 0) {
				typeId = results[0].id;
				if (output === "" && typeId) {
					checkNamesDiv = "<button class='btn btn-danger' onclick='deleteType(&apos;" + typeId + "&apos;)'>delete " + type + " ×</button>";
				}
			}
			setElementById("checkNamesDiv", checkNamesDiv);
		},
		error: function(error) {
			setElementById("checkNamesDiv", "<div><i class='glyphicon glyphicon-filter'></i> " + type + "</div>");
		}
	});
}

function scrollTo(ElementValue) {
	if (ElementValue != "") {
		$('html, body').animate({scrollTop: $(ElementValue).offset().top}, 1000);
	}
}

function setElementById(identification, string) {
	document.getElementById(identification).innerHTML = string;
}

function capitaliseFirstLetter(string) {
	if (string === null || string === undefined) return "";
	string = String(string);
	return string.toLowerCase().replace(/(?:^|[\s\-_.])([a-z0-9])/g, function(match) {
		return match.toUpperCase();
	});
}

function escapeJsString(str) {
	if (str === null || str === undefined) return '';
	return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function escapeHtml(str) {
	if (str === null || str === undefined) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function visit(string) {
	window.open(string);
}