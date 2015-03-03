
Parse.initialize("VCiFrwf8i1nDQRjVgPmjeNQQBr2Ui7HxNpT4JILI", "HKUvywcJF727ajICFcHKBpdAhTvA6zMJaVhV3lb2");

var nameStartsWithValue;
var neighborhoodStartsWithValue;
var type;
var sort;
var order;
var output;
var currentLocationPoint;
var currentLocationPointLatitude = 37.776804;
var currentLocationPointLongitude = -122.416844;
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
var sPage = sPath.substring(sPath.lastIndexOf('/') + 1);

$(document).ready(function() {
	if (sPage == "login.html") {
		checkCurrentUser();
		setUserInputs();
		userProfilePicture();
	} else if (sPage == "about.html") {		
		checkCurrentUser();
		userProfilePicture();		
	} else if (sPage == "index.html") {
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
		$(document).delegate('.twitter', 'focusout', function() {
			var associationObjectId = $(this).closest(".card").attr('id');
			updateTwitter(associationObjectId, "focusout");
		});
	}
});

function setDefaults() {
	setNameStartsWithValue(false);
	Parse.GeoPoint.current({
		success: function (point) {
			currentLocationPoint = point;
			currentLocationPointLatitude = currentLocationPoint.latitude;
			currentLocationPointLongitude = currentLocationPoint.longitude;
			var address = currentLocationPointLatitude + ", " + currentLocationPointLongitude;
			var geocoder = new google.maps.Geocoder();
			geocoder.geocode( { 'address': address}, function(results, status) {
				if (status == google.maps.GeocoderStatus.OK) {
					for (var i = 0; i < results[0].address_components.length; i++) {
						var address_component = results[0].address_components[i].long_name;
						if (results[0].address_components[i].types == "neighborhood,political") {
							neighborhood = results[0].address_components[i].long_name;
							setElementById("hood", "<span><img src='images/hood.png'></span><span>" + neighborhood + "</span>");
							setOrder("ascending", false);
							setTypeSelect();
						}
					}
				}
			});
		},
		error: function(error) {
			setTypeSelect();
			alert("current location not detected; default set to somewhere in San Francisco, California. ~(37.77, -122.41)");
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
		pic = currentUser.get("pic");
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
		$(".loginAlert").show();
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
	}
}

function checkCurrentUser() {
	var currentUser = Parse.User.current();
	if (currentUser) {
		username = currentUser.getUsername();
		userId = currentUser.id;
		setElementById("usernameDiv", "<b>" + capitaliseFirstLetter(username) + "</b>");
		document.getElementById("go").style.display = "inline-block";
		if (sPage == "login.html") {
			document.getElementById("loginBtn").style.display = "none";
			document.getElementById("signupBtn").style.display = "none";
		}
		getProfilePicture();
	} else {
		if (sPage == "about.html") {
			$('.login-alert').removeClass('alert-info').addClass('alert-danger');
		} else if (sPage == "login.html") {
			document.getElementById("go").style.display = "none";
			document.getElementById("loginBtn").style.display = "inline-block";
			document.getElementById("signupBtn").style.display = "inline-block";
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
	    window.location.href = 'login.html';
	}
}

function signup(e) {
	if (e.keyCode == 13 || e == "click") {
		usernameInput = document.getElementById("usernameInput").value.toLowerCase();
		passwordInput = document.getElementById("passwordInput").value;
		emailInput = document.getElementById("emailInput").value.toLowerCase();
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
		  },
		  error: function(user, error) {
		    alert("Error: " + error.code + " " + error.message);
				login('click');
		  }
		});
	}
}

function login(e) {
	if (e.keyCode == 13 || e == "click") {
		usernameInput = document.getElementById("usernameInput").value.toLowerCase();
		passwordInput = document.getElementById("passwordInput").value.toLowerCase();
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
				alert("Error: " + error.code + " " + error.message);
				signup('click');
			}
		});
	}
}

function logout() {
	Parse.User.logOut();
	setCurrentUser();
}

function setUsername(event) {
	if (event.which == 13 || event.keyCode == 13 || event == "click") {
		currentUser = Parse.User.current();
		username = $("#changeUsernameInput").val().toLowerCase();
		currentUser.save({
			username: username
		}, {
			success: function(currentUser) {
				alert("Username set to " + capitaliseFirstLetter(username) + ".");
				window.location.href = 'http://www.danielgoodwyn.com/rolodex/login.html';
		},
			error: function(currentUser, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function setEmail(event) {
	if (event.which == 13 || event.keyCode == 13 || event == "click") {
		currentUser = Parse.User.current();
		email = $("#changeEmailInput").val().toLowerCase();
		currentUser.save({
			email: email
		}, {
			success: function(currentUser) {
				alert("Email set to " + email + ".");
				window.location.href = 'http://www.danielgoodwyn.com/rolodex/login.html';
			},
			error: function(currentUser, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function resetPassword() {
  currentUser = Parse.User.current();
  email = $("#changeEmailInput").val().toLowerCase();
  Parse.User.requestPasswordReset(email, {
    success: function() {
		alert("Password reset request sent to " + email + ".");
    },
    error: function(error) {
      alert("Error: " + error.code + " " + error.message);
    }
  });
}

function getProfilePicture() {
	var profilePicture;
	var currentUser = Parse.User.current();
	if (currentUser) {
		profilePicture = currentUser.get('pic');
		if(document.getElementById("profilePicture")) {
			setElementById("profilePicture", "<a href=' " + profilePicture + " '><img src=" + profilePicture + ">");
			userProfilePicture();
		}
	}
}

function setProfilePicture(event) {
	if (event.which == 13 || event.keyCode == 13 || event == "click") {
		var profilePicture = document.getElementById("profilePictureInput").value;
		var currentUser = Parse.User.current();
		if (currentUser) {
			currentUser.set("pic", profilePicture);
			currentUser.save(null, {
				success: function(currentUser) {
					getProfilePicture();
				},
				error: function(currentUser, error) {
					alert("Error: " + error.code + " " + error.message);
				}
			});
		}
	}
}

function userProfilePicture() {
	var profilePicture;
	var currentUser = Parse.User.current();
	if (currentUser) {
		profilePicture = currentUser.get('pic');
		setElementById("userProfilePicture", "<img src=" + profilePicture + ">");
	}
}

function setTypeSelect() {
	var userTypeArray = [];
	var typeSelectDiv = "<select id='typeSelect' onchange='setType()'>";
	var query = new Parse.Query("Type");
	query.equalTo("userId", userId);
	query.ascending("type");
	query.find({
	success: function(results) {
		if (results.length == 0) {
			typeSelectDiv = typeSelectDiv + "<option disabled></option>";
			typeSelectDiv = typeSelectDiv + "</select>";
			setElementById("typeSelectDiv", typeSelectDiv);
			$("#create-card").show();
			$(".panels").hide();
			$("#checkNamesDiv").hide();
			$("#expandCards").hide();
			$("#collapseCards").hide();
		} else {
			$(".panels").show();
			$("#checkNamesDiv").show();
			$("#expandCards").show();
			$("#collapseCards").show();
			for (var i = 0; i < results.length; i++) {
				var object = results[i];
				userTypeArray.push(object.get('type'));
				for (var j = 0; j < userTypeArray.length; j++) {
					var listItemUserType = "";
					listItemUserType = userTypeArray[j];
				}
				typeSelectDiv = typeSelectDiv + "<option value='" + listItemUserType + "'>" + listItemUserType + "</option>";
			}
			typeSelectDiv = typeSelectDiv + "</select>";
			setElementById("typeSelectDiv", typeSelectDiv);
			setType();
		}
	},
	error: function(error) {
		alert("Error: " + error.code + " " + error.message);
	}
	});
}

function setType() {
	var typeSelect = document.getElementById("typeSelect");
	if (newTypeInputValueBool) {
		type = $("#newTypeInput").val();
		newTypeInputValueBool = false;		
	} else {
		type = typeSelect.options[typeSelect.selectedIndex].value;
	}	
	document.getElementById("newTypeInput").value = type;
	setSort();
}

function changeType(AssociationObjectId) {
	var newValue;
	var typeSelect = document.getElementById(AssociationObjectId + "changeTypeSelect")
	newValue = typeSelect.options[typeSelect.selectedIndex].value;
	var Association = Parse.Object.extend("Association");
	var query = new Parse.Query(Association);
	query.get(AssociationObjectId, {
		success: function(Association) {
			Association.set("type", newValue);
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
	document.getElementById("nameStartsWith").value = string;
	getAssociates();
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
		if (document.getElementById("newTypeInput").value == null || document.getElementById("newTypeInput").value == "") {
			type = "misc";
			$("#newTypeInput").val("misc");
		} else {
			type = document.getElementById("newTypeInput").value;
		}
		$("#newNameInput").val("");
		$("#typeSelect").val(type);
		association.set("name", name);
		association.set("type", type);
		association.set("userId", userId);
		association.save(null, {
			success: function(association) {
				scrollToItem = "#" + association.id;
				var query = new Parse.Query("Type");
				query.equalTo("type", type);
				query.equalTo("userId", userId);
				query.find({
				success: function(results) {
					if (results.length!=0) {
					} else {
						var Type = Parse.Object.extend("Type");
						var TypeObject = new Type();
						TypeObject.set("type", type);
						TypeObject.set("userId", userId);
						TypeObject.save(null, {
							success: function(Type) {
								newTypeInputValueBool = true;
								setTypeSelect();
							},
							error: function(Type, error) {
								alert("Error: " + error.code + " " + error.message);
							}
						});						
					}
					getAssociations();
				},
				error: function(error) {
					alert("Error: " + error.code + " " + error.message);
				}
				});
			},
			error: function(association, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
}

function newAssociate(event, AssociationObjectId) {
	if (event.which == 13 || event.keyCode == 13 || event == "click") {
		var Association = Parse.Object.extend("Association");
		var association = new Association();
		var name = "";
		var divElement = "";
		var Type;
		name = document.getElementById('newNameInput' + AssociationObjectId).value;
		association.set("name", name);
		association.set("type", "associate");
		association.set("userId", userId);
		association.set("associationId", AssociationObjectId);
		association.save(null, {
			success: function(association) {
				var query = new Parse.Query("Type");
				query.equalTo("type", type);
				query.equalTo("userId", userId);
				query.find({
				success: function(results) {
					if (results.length!=0) {
					} else {
						var Type = Parse.Object.extend("Type");
						var TypeObject = new Type();
						TypeObject.set("type", type);
						TypeObject.set("userId", userId);
						TypeObject.set("associationId", AssociationObjectId);
						TypeObject.save(null, {
							success: function(Type) {
								setTypeSelect();
							},
							error: function(Type, error) {
								alert("Error: " + error.code + " " + error.message);
							}
						});
					}
					getAssociations();
				},
				error: function(error) {
					alert("Error: " + error.code + " " + error.message);
				}
				});
			},
			error: function(association, error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	}
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
				} else {
					if (!newValue.match(/^[a-zA-Z]+:\/\//)) {
						newValue = 'http://' + newValue;
					}
					Association.set("twitter", newValue);
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
		var geocoder = new google.maps.Geocoder();
		geocoder.geocode( { 'address': address}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				var latitude = results[0].geometry.location.lat();
				var longitude = results[0].geometry.location.lng();
				var geoValue = new Parse.GeoPoint({latitude: latitude, longitude: longitude});
				var formatted_address = results[0].formatted_address;
				var objectsArray = [];
				var neighborhood = "";
				neighborhood = results[0].address_components[0].long_name;
				var Association = Parse.Object.extend("Association");
				var query = new Parse.Query(Association);
				query.get(AssociationObjectId, {
					success: function(Association) {
						Association.set("geo", geoValue);
						Association.set("neighborhood", neighborhood);
						Association.set("location", formatted_address);
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
				for (var i = 0; i < results[0].address_components.length; i++) {
					var address_component = results[0].address_components[i].long_name;
					if (results[0].address_components[i].types == "neighborhood,political") {
						neighborhood = results[0].address_components[i].long_name;
						var Association = Parse.Object.extend("Association");
						var query = new Parse.Query(Association);
						query.get(AssociationObjectId, {
							success: function(Association) {
								Association.set("geo", geoValue);
								Association.set("neighborhood", neighborhood);
								Association.set("location", formatted_address);
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
			}
		});
	}
}

function getAssociates() {
	type = "associate";
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
	query.equalTo("type", type);
	if (nameStartsWithValue != null || nameStartsWithValue != "") {
		query.matches("name", "(" + capitaliseFirstLetter(nameStartsWithValue) + "|" + nameStartsWithValue.toLowerCase() + ")" + ".*");
	}
	if (neighborhoodStartsWithValue != null && neighborhoodStartsWithValue != "" && neighborhoodStartsWithValue != "(undefined)") {
		query.matches("neighborhood", "(" + capitaliseFirstLetter(neighborhoodStartsWithValue) + "|" + neighborhoodStartsWithValue.toLowerCase() + ")" + ".*");
	}	
	if (sort != null || sort != "") {
		if (order != null || order != "") {
			if (sort == "distance") {
				Parse.GeoPoint.current({
				    success: function (point) {
						currentLocationPoint = point;
						currentLocationPointLatitude = currentLocationPoint.latitude;
						currentLocationPointLongitude = currentLocationPoint.longitude;
						var address = currentLocationPointLatitude + ", " + currentLocationPointLongitude;
						var geocoder = new google.maps.Geocoder();
						geocoder.geocode( { 'address': address}, function(results, status) {
							if (status == google.maps.GeocoderStatus.OK) {
								for (var i = 0; i < results[0].address_components.length; i++) {
									var address_component = results[0].address_components[i].long_name;
									if (results[0].address_components[i].types == "neighborhood,political") {
										neighborhood = results[0].address_components[i].long_name;
										setElementById("hood", "<span>" + neighborhood + "</span>");
										query.near("geo", currentLocationPoint);										
									}
								}
							}
						});
					}
				});
			} else {
				if (order == "descending") {
					query.descending(sort);
				} else {
					query.ascending(sort);
				}
			}
		}
	} else {
		if (order != null || order != "") {
			if (order == "descending") {
				query.descending("name");
			} else {
				query.ascending("name");
			}
		}
	}
	query.equalTo("userId", userId);
	query.find({
	success: function(results) {
		for (var i = 0; i < results.length; i++) {
			var object = results[i];
			idsArray.push(object.id);
			namesArray.push(object.get('name'));
			typesArray.push(object.get('type'));
			sitesArray.push(object.get('site'));
			fbArray.push(object.get('fb'));
			igArray.push(object.get('ig'));
			twitterArray.push(object.get('twitter'));
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
			var listItemLocation = "";
			listItemId = idsArray[j];
			listItemName = namesArray[j];
			listItemType = typesArray[j];
			listItemLocation = locationArray[j];
			if (listItemLocation == "undefined" || listItemLocation == undefined) {
				listItemLocation = "";
			}
			var listItemGeo = "";
			var listItemLatitude = 122.4167;
			var listItemLongitude = 37.7833;
			
			if (geoArray[j] != undefined) {
				listItemLatitude = (Math.round(geoArray[j].latitude * 1000) / 1000);
				listItemLongitude = (Math.round(geoArray[j].longitude * 1000) / 1000);
				var distance = (Math.round(Math.abs(((currentLocationPointLatitude - listItemLatitude) + (currentLocationPointLongitude - listItemLongitude)) * (69)) * 1000) / 1000);
				distanceArray.push(distance);
				listItemGeo = distance;
				if (listItemGeo > (-180) || listItemGeo < (180)) {
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

			output = output + "<div class='col-xs-6 col-sm-6 col-md-8 col-lg-9'>";
			output = output + "<span class='rating'>";
			output = output + "<input style='background:" + listItemRatingColor + ";' placeholder='my rating (1-100)' type='number' min='0' max='100' step='5' id='" + listItemId + "ratingInput' onchange='updateRating(&apos;" + listItemId + "&apos;)' value='" + listItemRating + "'>";
			output = output + "</span></div>";

			output = output + "<div class='col-xs-6 col-sm-5 col-md-4 col-lg-3'>";
			output = output + "<p><select id='" + listItemId + "changeTypeSelect' onchange='changeType(&apos;" + listItemId + "&apos;)'>";			
			output = output + "<option value='" + listItemType + "'>" + listItemType + "</option>";
			output = output + document.getElementById("typeSelect").innerHTML;
			output = output + "</select></p></div></div>";

			output = output + "<div id='accordion-" + listItemId + "' role='tablist' aria-multiselectable='true'><h2><div data-toggle='collapse' data-parent='#accordion-" + listItemId + "' href='#collapse" + listItemId + "Location' aria-expanded='true' aria-controls='collapse" + listItemId + "Location' class='collapsed'>";
			output = output + "<i class='glyphicon glyphicon-map-marker'></i> Location<i class='float-left glyphicon glyphicon-collapse-down toggleCollapseGlyphicon'></i></div></h2>";
			output = output + "<div id='collapse" + listItemId + "Location' class='panel-collapse collapse in' role='tabpanel' aria-labelledby='headingOne'>";

			output = output + "<div class='row'>";

			output = output + "<div class='col-xs-12 col-sm-6 col-md-6 col-lg-7'>";

			output = output + "<input class='locationInput' placeholder='location (example: 3101 24th Street, San Francisco, CA)' type='text' id='" + listItemId + "locationInput' onkeyup='updateLocation(&apos;" + listItemId + "&apos;, event)' value='" + listItemLocation + "'>";
			output = output + "</div>";

			output = output + "<div class='col-xs-12 col-sm-6 col-md-4 col-lg-3'>";
			output = output + "<p>" + listItemNeighborhood + "</p>";
			output = output + "</div>";
			output = output + "<div class='hidden-xs hidden-sm col-md-2 col-lg-2'>";
			output = output + "<p>" + listItemGeo + "</p>";
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
			output = output + "<button class='btn btn-default btn-twitter' " + twitterDisplay + " onclick='visit(&apos;" + listItemTwitter + "&apos;)'>tw <i class='glyphicon glyphicon-new-window'></i></button>";
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
			output = output + "<input class='twitter corners-left' placeholder='twitter (url)' type='text' id='" + listItemId + "twitterInput' onkeyup='updateTwitter(&apos;" + listItemId + "&apos;, event)' value='" + listItemTwitter + "'>";
			output = output + "</div></div></div></div>";

			output = output + "<div></div><div class'row'>";

			output = output + "<div class='clearfix'></div>";

			output = output + "<h2><div data-toggle='collapse' data-parent='#accordion-" + listItemId + "' href='#collapse" + listItemId + "Associates' aria-expanded='true' aria-controls='collapse" + listItemId + "Associates' class='collapsed'>";
			output = output + "<i class='glyphicon glyphicon-user'></i> Associates<i class='float-left glyphicon glyphicon-collapse-down toggleCollapseGlyphicon'></i></div></h2>";
			output = output + "<div id='collapse" + listItemId + "Associates' class='panel-collapse collapse in' role='tabpanel' aria-labelledby='headingOne'>";

			output = output + "<div class='row'><div class='col-xs-12 col-sm-12 col-md-12 col-lg-12'><div id='associate" + listItemId + "'></div></div></div>";
			output = output + "<div class='row'><div class='col-xs-10 col-sm-11 col-md-11 col-lg-11'>";
			output = output + "<input placeholder='New Associate (example: Phil Jaber)' type='text' id='newNameInput" + listItemId + "' onkeyup='newAssociate(event, &apos;" + listItemId + "&apos;)' value=''>";
			
			output = output + "</div><div class='col-xs-2 col-sm-1 col-md-1 col-lg-1'>";
			output = output + "<button class='newAssociate btn btn-primary btn-block'>+</button>";
			output = output + "</div></div></div></div>";

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
		var associationIdsArray = [];
		var associateIdsArray = [];
		var associationNamesArray = [];
		var associationId = "";
		var associateId = "";
		var associateName = "";
		var query = new Parse.Query("Association");
		query.equalTo("type", "associate");
		query.equalTo("userId", userId);
		query.ascending("name");
		query.find({
			success: function(results) {
				for (var i = 0; i < results.length; i++) {
					var object = results[i];
					associationIdsArray.push(object.get('associationId'));
					associateIdsArray.push(object.id);
					associationNamesArray.push(object.get('name'));
					associateName = associationNamesArray[i];
					associateId = associateIdsArray[i];
					associationId = associationIdsArray[i];
					if (document.getElementById("associate" + associationId)) {
						setElementById("associate" + associationId, document.getElementById("associate" + associationId).innerHTML + "<div class='btn-padding float-left'><div class='btn-group btn-group' role='group'><div class='btn-group' role='group'><button class='btn btn-default' onclick='findAssociate(&apos;" + associateName + "&apos;)'>" + associateName + "</button></div><div class='btn-group' role='group'><button class='btn btn-danger' onclick='deleteAssociation(&apos;" + associateId + "&apos;)'>×</button></div></div></div>");
					}
				}
				var noteIdsArray = [];
				var noteId = [];
				var query = new Parse.Query("Association");
				query.equalTo("userId", userId);
				query.notEqualTo("type", "associate");
				query.ascending("name");
				query.find({
					success: function(results) {
						for (var i = 0; i < results.length; i++) {
							var object = results[i];
							noteIdsArray.push(object.id);
							noteId = noteIdsArray[i];
							getNotes(noteId);
						}
					},
					error: function(error) {
						alert("Error: " + error.code + " " + error.message);
					}
				});
			},
			error: function(error) {
				alert("Error: " + error.code + " " + error.message);
			}
		});
	},
	error: function(error) {
		alert("Error: " + error.code + " " + error.message);
	}
	});
}

function checkNames() {
	var checkNamesDiv = "";
	var typeId;

	var typeQuery = new Parse.Query("Type");
	typeQuery.equalTo("type", type);
	typeQuery.find({
	success: function(results) {
		typeId = results[0].id;
		checkNamesDiv = "<div><i class='glyphicon glyphicon-filter'></i> " + type + "</div>";
		if (output=="") {
			checkNamesDiv = "<button class='btn btn-danger' onclick='deleteType(&apos;" + typeId + "&apos;)'>delete " + type + " ×</button>";
		}
		setElementById("checkNamesDiv", checkNamesDiv);
	},
	error: function(error) {
		alert("Error: " + error.code + " " + error.message);
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
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function visit(string) {
	window.open(string);
}