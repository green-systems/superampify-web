/*global window: false*/
(function(w) {
    var js = ['common/subtunes-0.9.4.min.js','desktop/subtunes-0.9.4.min.js'];
        
    w.subtunes.overrideDefaultExtHandlersOnConnection = function() {
		if (!Ext.isDefined(Ext.data.Connection.prototype._handleFailure)) {
			Ext.data.Connection.prototype._handleFailure = Ext.data.Connection.prototype.handleFailure;
			Ext.data.Connection.prototype.handleFailure = function(response, e) {
				var json = {};
				try {
					json = Ext.decode(response.responseText);
					json = json['subsonic-response'];
					response.responseData = json;
				} catch (err) {
					json.error = { code: response.status, message: 'An unexpected error occured ' + err};
					json.status = 'Error';
				}
				if (json.status !== 'ok') {
					Ext.MessageBox.setIcon(Ext.MessageBox.ERROR);
					Ext.MessageBox.alert('Error code: '+json.error.code, 'An error occured:<br/>'+json.error.message);
				}
				Ext.data.Connection.prototype._handleFailure.call(this, response, e);
			};
		}
        // Add global error handler
		if (!Ext.isDefined(Ext.data.Connection.prototype._handleResponse)) {
			Ext.data.Connection.prototype._handleResponse = Ext.data.Connection.prototype.handleResponse;
			Ext.data.Connection.prototype.handleResponse = function(response) {
				var json = {};
				try {
					json = Ext.decode(response.responseText);
					json = json['subsonic-response'];
					window.subtunes.serverVersion = json.version;
					response.responseData = json;
				} catch (e) {
					json.error = { code: response.status, message: 'An unexpected error occured ' + e};
					json.status = 'Error';
				}
				if (json.status !== 'ok') {
					if (!((json.error.code === 10 || json.error.code === 404) && !Ext.isDefined(Ext.ux.mattgoldspink.subsonic.LoginDetails.u))) {
						Ext.MessageBox.setIcon(Ext.MessageBox.ERROR);
						Ext.MessageBox.alert('Error code: '+json.error.code, 'An error occured:<br/>'+json.error.message);
					}
				}
				Ext.data.Connection.prototype._handleResponse.call(this, response);
			};
		}
    };
	
	w.subtunes.makeRequest = function(w, urls, params, i) {
		var loc = w.location, urlPrefix = loc.protocol + '//' + loc.host;
		if ((i === urls.length && urls.length !== 0) || urls.length === 0) {
			Ext.MessageBox.hide();
			Ext.MessageBox.prompt(
				'Subsonic path', 
				'Enter the path to subsonic (It must be on the same webserver, eg. ' + urlPrefix + '/subsonic ):', function(btn, text){
					if (btn == 'ok'){
						if (text.substr(-1) === '/') {
							text = text.substr(0, text.length - 1);
						}
						if (text.indexOf(urlPrefix) != -1) {
							text = text.substr(urlPrefix.length);
						}
						urls.push(text);
						w.subtunes.makeRequest(w, urls, params, i);
					}
				}, this, false, 
				loc.protocol + '//' + loc.host
			);
		} else {
			Ext.MessageBox.show({
			   msg: 'Attempting to auto discover subsonic api url...<br>Testing: ' + urlPrefix + urls[i],
			   progressText: 'Checking',
			   width:300,
			   wait:true,
			   waitConfig: {interval:200}
			});
			var response = jQuery.ajax({
				   url: urls[i++] + '/rest/ping.view',
				   async: false,
				   data: params
			});
			if (response.status !== 404) {
				try {
					// see if the resonse is JSON and can pull out subsonic-response
					var dead = Ext.decode(response.responseText)['subsonic-response'];
					Ext.MessageBox.hide();
					w.subtunes.userPrefsStore.setApiUrl(urls[i-1]);
					Ext.ux.mattgoldspink.subsonic.notYetLoggedIn = true;
					w.subtunes.overrideDefaultExtHandlersOnConnection();
				} catch (e) {
					w.subtunes.makeRequest(w, urls, params, i);
				}
			} else {
                if ((i === urls.length && urls.length !== 0) || urls.length === 0) {
                    Ext.MessageBox.alert('Subsonic not found!', 'No subsonic instance was found at ' + urlPrefix + urls[i - 1] + '. Please try again...', function(){
                        Ext.MessageBox.hide();
                        w.subtunes.makeRequest(w, urls, params, i);
                    });
                } else {
                    w.subtunes.makeRequest(w, urls, params, i);
                }
			}
		}
	};
    
    // test for webworkers first
    if (!!!w.Worker) {
        Ext.MessageBox.alert('Incompatible browser!', 'Subtunes requires the WebWorker feature from HTML5. Your browser does not support this.<br/>For the best experience try one of the following browsers:<ul><li><a href="http://getfirefox.com">Firefox</a></li><li><a href="http://www.google.com/chrome">Google Chrome</a></li><li><a href="http://www.apple.com/safari">Safari</a></li><li><a href="http://www.opera.com">Opera</a></li><li><strong>BETA</strong>... or try your iPad!</li></ul>');
    } else if (!Ext.isDefined(Ext.ux.mattgoldspink.subsonic.apiUrl)) {
        var i = 0;
        var urls = ['', '/subsonic', '/music'];
        w.subtunes.writeJsToDoc(js);
        w.subtunes.makeRequest(w, urls, Ext.apply({}, Ext.ux.mattgoldspink.subsonic.LoginDetails), 0);
    } else {
        w.subtunes.overrideDefaultExtHandlersOnConnection();
        w.subtunes.writeJsToDoc(js);
        Ext.ux.mattgoldspink.subsonic.notYetLoggedIn = true;
    }
})(window);
