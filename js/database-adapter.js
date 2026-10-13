/**
 * Firebase Adapter for Rolodex
 * Replaces the deprecated Parse JavaScript SDK 1.3.3 with Firebase v8 SDK (Firestore & Auth)
 */

const Parse = {
  initialize: function() {
    if (!firebase.apps || !firebase.apps.length) {
      if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('PLACEHOLDER')) {
        firebase.initializeApp(firebaseConfig);
      } else {
        console.warn("Firebase configuration is not configured or using placeholders.");
      }
    }

    // Synchronously restore cached user from localStorage if present
    try {
      var raw = localStorage.getItem('parse_current_user');
      if (raw) {
        var cached = JSON.parse(raw);
        if (cached && cached.uid) {
          Parse.User._currentUser = new Parse.UserClass({ uid: cached.uid, email: (cached.data && cached.data.email) || '' }, cached.data || {});
        }
      }
    } catch (e) {}

    window.db = (firebase.apps && firebase.apps.length) ? firebase.firestore() : null;
    window.auth = (firebase.apps && firebase.apps.length) ? firebase.auth() : null;

    if (window.auth) {
      Parse._authResolving = true;
      auth.onAuthStateChanged(function(user) {
        Parse._authResolving = false;
        if (user) {
          db.collection('users').doc(user.uid).get().then(function(doc) {
            var userData = doc.exists ? doc.data() : { email: user.email };
            Parse.User._currentUser = new Parse.UserClass(user, userData);
            try {
              localStorage.setItem('parse_current_user', JSON.stringify({ uid: user.uid, data: userData }));
            } catch (e) {}
            if (typeof checkCurrentUser === 'function') checkCurrentUser();
            if (typeof setUserInputs === 'function') setUserInputs();
            if (typeof setCurrentUser === 'function') setCurrentUser();
          }).catch(function() {
            var userData = { email: user.email };
            Parse.User._currentUser = new Parse.UserClass(user, userData);
            try {
              localStorage.setItem('parse_current_user', JSON.stringify({ uid: user.uid, data: userData }));
            } catch (e) {}
            if (typeof checkCurrentUser === 'function') checkCurrentUser();
            if (typeof setUserInputs === 'function') setUserInputs();
            if (typeof setCurrentUser === 'function') setCurrentUser();
          });
        } else {
          Parse.User._currentUser = null;
          try {
            localStorage.removeItem('parse_current_user');
          } catch (e) {}
          if (typeof checkCurrentUser === 'function') checkCurrentUser();
          if (typeof setUserInputs === 'function') setUserInputs();
          if (typeof sPage !== 'undefined' && sPage === 'index') {
            window.location.href = 'login';
          }
        }
      });
    }
  },

  GeoPoint: function(coords) {
    this.latitude = (coords && coords.latitude !== undefined) ? coords.latitude : 0;
    this.longitude = (coords && coords.longitude !== undefined) ? coords.longitude : 0;
  }
};

Parse.GeoPoint.current = function(callbacks) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        var pt = new Parse.GeoPoint({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        if (callbacks && callbacks.success) callbacks.success(pt);
      },
      function(err) {
        if (callbacks && callbacks.error) callbacks.error(err);
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  } else {
    if (callbacks && callbacks.error) callbacks.error(new Error("Geolocation unsupported"));
  }
};

Parse.ObjectClass = function(className, id, data) {
  this.className = className;
  this.id = id || null;
  this.data = data || {};

  this.get = function(key) {
    var val = this.data[key];
    if (key === 'geo' && val && typeof val === 'object' && val.latitude !== undefined) {
      return new Parse.GeoPoint(val);
    }
    return val;
  };

  this.set = function(key, val) {
    if (val instanceof Parse.GeoPoint) {
      this.data[key] = { latitude: val.latitude, longitude: val.longitude };
    } else {
      this.data[key] = val;
    }
  };

  this.unset = function(key) {
    delete this.data[key];
  };

  this.existed = function() {
    return !!this.id;
  };

  this.save = function(attrs, callbacks) {
    var self = this;
    if (attrs) {
      for (var k in attrs) {
        self.set(k, attrs[k]);
      }
    }
    if (!window.db) {
      var err = { code: 500, message: "Database not connected. Please check Firebase configuration." };
      if (callbacks && callbacks.error) callbacks.error(self, err);
      return;
    }

    var cleanData = Object.assign({}, self.data);
    if (!self.id) {
      cleanData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      db.collection(self.className).add(cleanData).then(function(ref) {
        self.id = ref.id;
        if (callbacks && callbacks.success) callbacks.success(self);
      }).catch(function(err) {
        if (callbacks && callbacks.error) callbacks.error(self, err);
      });
    } else {
      cleanData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      db.collection(self.className).doc(self.id).set(cleanData, { merge: true }).then(function() {
        if (callbacks && callbacks.success) callbacks.success(self);
      }).catch(function(err) {
        if (callbacks && callbacks.error) callbacks.error(self, err);
      });
    }
  };

  this.destroy = function(callbacks) {
    var self = this;
    if (!self.id || !window.db) {
      if (callbacks && callbacks.success) callbacks.success(self);
      return;
    }
    db.collection(self.className).doc(self.id).delete().then(function() {
      if (callbacks && callbacks.success) callbacks.success(self);
    }).catch(function(err) {
      if (callbacks && callbacks.error) callbacks.error(self, err);
    });
  };
};

Parse.Object = {
  extend: function(className) {
    var constructor = function(id, data) {
      return new Parse.ObjectClass(className, id, data);
    };
    constructor.className = className;
    return constructor;
  }
};

Parse.UserClass = function(authUser, data) {
  Parse.ObjectClass.call(this, 'users', authUser ? authUser.uid : null, data);
  this.authUser = authUser;

  this.getUsername = function() {
    return this.data.username || (this.authUser ? (this.authUser.displayName || this.authUser.email.split('@')[0]) : '');
  };

  this.getEmail = function() {
    return this.data.email || (this.authUser ? this.authUser.email : '');
  };

  this.signUp = function(attrs, callbacks) {
    var self = this;
    var email = self.data.email || (self.data.username ? self.data.username + '@rolodex.com' : '');
    var password = self.data.password;
    if (!email || !password) {
      if (callbacks && callbacks.error) callbacks.error(self, { code: 400, message: "Email and password are required" });
      return;
    }
    if (!window.auth) {
      if (callbacks && callbacks.error) callbacks.error(self, { code: 500, message: "Firebase Auth not connected." });
      return;
    }

    auth.createUserWithEmailAndPassword(email, password).then(function(cred) {
      self.id = cred.user.uid;
      self.authUser = cred.user;
      delete self.data.password;
      return db.collection('users').doc(self.id).set(self.data, { merge: true });
    }).then(function() {
      Parse.User._currentUser = self;
      try {
        localStorage.setItem('parse_current_user', JSON.stringify({ uid: self.id, data: self.data }));
      } catch (e) {}
      if (callbacks && callbacks.success) callbacks.success(self);
    }).catch(function(err) {
      if (callbacks && callbacks.error) callbacks.error(self, { code: err.code || 400, message: err.message });
    });
  };
};

Parse.User = {
  _currentUser: null,
  current: function() {
    return this._currentUser;
  },
  logIn: function(usernameOrEmail, password, callbacks) {
    if (!window.auth) {
      if (callbacks && callbacks.error) callbacks.error(null, { code: 500, message: "Firebase Auth not initialized" });
      return;
    }

    var doSignIn = function(emailToUse) {
      auth.signInWithEmailAndPassword(emailToUse, password).then(function(cred) {
        return db.collection('users').doc(cred.user.uid).get().then(function(doc) {
          var userData = doc.exists ? doc.data() : { email: cred.user.email };
          Parse.User._currentUser = new Parse.UserClass(cred.user, userData);
          try {
            localStorage.setItem('parse_current_user', JSON.stringify({ uid: cred.user.uid, data: userData }));
          } catch (e) {}
          if (callbacks && callbacks.success) callbacks.success(Parse.User._currentUser);
        });
      }).catch(function(err) {
        if (callbacks && callbacks.error) callbacks.error(null, { code: err.code || 400, message: err.message });
      });
    };

    if (usernameOrEmail.includes('@')) {
      doSignIn(usernameOrEmail);
    } else {
      if (!window.db) {
        doSignIn(usernameOrEmail + '@rolodex.com');
        return;
      }
      db.collection('users').where('username', '==', usernameOrEmail.toLowerCase()).limit(1).get().then(function(snap) {
        if (!snap.empty && snap.docs[0].data().email) {
          doSignIn(snap.docs[0].data().email);
        } else {
          doSignIn(usernameOrEmail + '@rolodex.com');
        }
      }).catch(function() {
        doSignIn(usernameOrEmail + '@rolodex.com');
      });
    }
  },
  logOut: function() {
    if (window.auth) auth.signOut();
    Parse.User._currentUser = null;
    try {
      localStorage.removeItem('parse_current_user');
    } catch (e) {}
  },
  requestPasswordReset: function(email, callbacks) {
    if (!window.auth) {
      if (callbacks && callbacks.error) callbacks.error({ code: 500, message: "Firebase Auth not initialized" });
      return;
    }
    auth.sendPasswordResetEmail(email).then(function() {
      if (callbacks && callbacks.success) callbacks.success();
    }).catch(function(err) {
      if (callbacks && callbacks.error) callbacks.error({ code: err.code || 400, message: err.message });
    });
  }
};

Parse.User = Object.assign(function() {
  return new Parse.UserClass();
}, Parse.User);

Parse.Query = function(className) {
  this.className = (typeof className === 'string') ? className : (className.className || 'Association');
  this._whereEqual = {};
  this._whereNotEqual = {};
  this._matches = {};
  this._order = [];
  this._limit = 1000;
  this._nearPoint = null;

  this.equalTo = function(key, val) {
    this._whereEqual[key] = val;
  };

  this.notEqualTo = function(key, val) {
    this._whereNotEqual[key] = val;
  };

  this.matches = function(key, regexStr) {
    this._matches[key] = regexStr;
  };

  this.ascending = function(key) {
    if (key) this._order = [{ field: key, dir: 'asc' }];
  };

  this.descending = function(key) {
    if (key) this._order = [{ field: key, dir: 'desc' }];
  };

  this.near = function(field, point) {
    this._nearPoint = point;
  };

  this.limit = function(num) {
    this._limit = num;
  };

  this.get = function(id, callbacks) {
    var self = this;
    if (!window.db) {
      if (callbacks && callbacks.error) callbacks.error(null, { code: 500, message: "Database not connected" });
      return;
    }
    db.collection(self.className).doc(id).get().then(function(doc) {
      if (doc.exists) {
        var obj = new Parse.ObjectClass(self.className, doc.id, doc.data());
        if (callbacks && callbacks.success) callbacks.success(obj);
      } else {
        if (callbacks && callbacks.error) callbacks.error(null, { code: 404, message: "Document not found" });
      }
    }).catch(function(err) {
      if (callbacks && callbacks.error) callbacks.error(null, err);
    });
  };

  this.first = function(callbacks) {
    this.limit(1);
    this.find({
      success: function(results) {
        if (callbacks && callbacks.success) callbacks.success(results.length ? results[0] : null);
      },
      error: function(err) {
        if (callbacks && callbacks.error) callbacks.error(err);
      }
    });
  };

  this.find = function(callbacks) {
    var self = this;
    if (!window.db) {
      if (callbacks && callbacks.error) callbacks.error({ code: 500, message: "Database not connected" });
      return;
    }

    var queryRef = db.collection(self.className);
    if (self._whereEqual.userId) {
      queryRef = queryRef.where('userId', '==', self._whereEqual.userId);
    }

    queryRef.get().then(function(snap) {
      var items = snap.docs.map(function(d) {
        return new Parse.ObjectClass(self.className, d.id, d.data());
      });

      // In-memory filter for remaining equalTo conditions
      for (var eqKey in self._whereEqual) {
        if (eqKey === 'userId') continue;
        var eqVal = self._whereEqual[eqKey];
        items = items.filter(function(item) {
          return item.get(eqKey) === eqVal;
        });
      }

      // In-memory filter for notEqualTo
      for (var neqKey in self._whereNotEqual) {
        var neqVal = self._whereNotEqual[neqKey];
        items = items.filter(function(item) {
          return item.get(neqKey) !== neqVal;
        });
      }

      // In-memory regex matching
      for (var matchKey in self._matches) {
        var pattern = self._matches[matchKey];
        if (pattern) {
          try {
            var rx = new RegExp(pattern, 'i');
            items = items.filter(function(item) {
              var val = item.get(matchKey) || '';
              return rx.test(val);
            });
          } catch(e) {
            console.error("Invalid regex filter:", pattern, e);
          }
        }
      }

      // Sort
      if (self._nearPoint && self._nearPoint.latitude !== undefined) {
        var targetLat = self._nearPoint.latitude;
        var targetLng = self._nearPoint.longitude;
        items.sort(function(a, b) {
          var aGeo = a.get('geo');
          var bGeo = b.get('geo');
          var aDist = aGeo ? (Math.pow(aGeo.latitude - targetLat, 2) + Math.pow(aGeo.longitude - targetLng, 2)) : Infinity;
          var bDist = bGeo ? (Math.pow(bGeo.latitude - targetLat, 2) + Math.pow(bGeo.longitude - targetLng, 2)) : Infinity;
          return aDist - bDist;
        });
      } else if (self._order.length > 0 && self._order[0].field) {
        var sortField = self._order[0].field;
        var isAsc = self._order[0].dir === 'asc';
        items.sort(function(a, b) {
          var va = a.get(sortField);
          var vb = b.get(sortField);
          var aEmpty = (va === undefined || va === null || va === "");
          var bEmpty = (vb === undefined || vb === null || vb === "");
          if (aEmpty && bEmpty) return 0;
          if (aEmpty) return 1;
          if (bEmpty) return -1;
          var numA = Number(va);
          var numB = Number(vb);
          if (!isNaN(numA) && !isNaN(numB)) {
            return isAsc ? numA - numB : numB - numA;
          }
          var sa = String(va).toLowerCase();
          var sb = String(vb).toLowerCase();
          if (sa < sb) return isAsc ? -1 : 1;
          if (sa > sb) return isAsc ? 1 : -1;
          return 0;
        });
      }

      if (self._limit && items.length > self._limit) {
        items = items.slice(0, self._limit);
      }

      if (callbacks && callbacks.success) callbacks.success(items);
    }).catch(function(err) {
      if (callbacks && callbacks.error) callbacks.error(err);
    });
  };
};
