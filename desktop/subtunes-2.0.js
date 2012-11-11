Ext.ux.mattgoldspink.subsonic.NewVersionWindow = Ext.extend(Ext.Window, {
    constructor: function(config) {
        Ext.apply(config, {
            width: 600,
            height: 400,
            closeAction: 'close',
            plain: true,
            modal: true,
            cls: 'about-window',
            title: 'Subtunes ' + Ext.ux.mattgoldspink.subsonic.subTunesVersion,
            items: [
                {
                    html: '<p>Subtunes current version can be found under <a href="https://github.com/interstel/subtunes">https://github.com/interstel/subtunes</a>.</p></p>The original version is written by <a target="_blank" href="http://www.mattgoldspink.co.uk">Matt Goldspink</a></p><p>It includes contributions from: <ul><li>Josh Knutson (Chrome app)</li></ul><h3>Licence</h3><p>Subtunes is licenced under the <a target="_blank" href="http://www.gnu.org/licenses/gpl-3.0.html">GNU GPL licence v3</a>.</p><p>It incorporates the following JS libraries:<ul><li><a target="_blank" href="http://sencha.com/products/js">Ext.js</a> (<em><a target="_blank" href="http://www.gnu.org/licenses/gpl-3.0.html">GNU GPL licence v3</a></em>)</li><li><a target="_blank" href="http://sencha.com/products/touch">Sencha touch</a> (<em><a target="_blank" href="http://www.gnu.org/licenses/gpl-3.0.html">GNU GPL licence v3</a></em>)</li><li><a target="_blank" href="http://www.jquery.org">jQuery</a> (<em><a target="_blank" href="https://github.com/jquery/jquery/blob/master/GPL-LICENSE.txt">GPL</a></em>)</li><li><a target="_blank" href="http://www.schillmania.com/projects/soundmanager2">SoundManager2</a> (<em><a target="_blank" href="http://www.schillmania.com/projects/soundmanager2/docs/resources/#licensing">BSD License</a></em>)</li><li><a target="_blank" href="http://pollenjs.com">hive</a> (<em><a target="_blank" href="http://www.gnu.org/licenses/gpl-2.0.html">GNU GPL v2</a></em>)</li><li><a target="_blank" href="http://finnrudolph.de/ImageFlow/Download">ImageFlow</a> (<em><a target="_blank" href="http://finnrudolph.de/ImageFlow/Download">Creative Commons Attribution-Noncommericial 3.0 unported licence</a></em>)</li><li><a target="_blank" href="http://pablotron.org/software/persist-js/">PersistJS</a> (<em><a target="_blank" href="http://hg.pablotron.org/persist-js/file/9d17e268a9e0/COPYING">MIT Licence</a></em>)</li></ul><h3>Special Thanks</h3><ul><li>Sindre Mehus - Developer of the excellent <a target="_blank" href="http://www.subsonic.org">Subsonic</a> music streaming software</li><li>Paul Goldsmith - For excellent advice on web worker strategy in Subtunes</li></ul>'
                }
            ],
            buttons: [{
                text: 'Close',
                handler: function() {
                    this.close();
                },
                scope: this
            }]
        });
        Ext.ux.mattgoldspink.subsonic.NewVersionWindow.superclass.constructor.call(this, config);
    }
});
/*global Persist: false, window: false, soundManager: false*/
Ext.ns('Ext.ux.state');
Ext.ux.state.PersistStateProvider = Ext.extend(Ext.state.Provider, {
    constructor: function(config) {
        Ext.ux.state.PersistStateProvider.superclass.constructor.call(this, config);
        this.store = new Persist.Store(config.name);
        if (config.defaults) {
            var me = this;
            $.each(config.defaults, function(key, val) {
                if (!Ext.isDefined(me.get(key))) {
                    me.set(key, val.defaultValue);
                }
            });
            this.defaults = config.defaults;
        }
    },
    set: function(name, value) {
        if (typeof value == "undefined" || value === null) {
            return;
        }
        var val = this.encodeValue(value);
        this.store.set(name, val);
        this.fireEvent("statechange", this, name, value);
    },
    get: function(name, defaultValue) {
        var val = null;
        this.store.get(name, function(k,v) {
            if (k) {
                val = v;
            }
        });
        if (val) {
            return this.decodeValue(val);
        }
        return defaultValue;
    },
    clear: function(name) {
        this.store.remove(name);
        this.fireEvent("statechange", this, name, null);
    }
});

Ext.ux.mattgoldspink.subsonic.UserPrefsStore =  new Ext.ux.state.PersistStateProvider({
    name: 'subtunes-user-preferences',
    defaults: {
        'track-grid-batch-size': {
            text: "Track grid batch load size",
			description: "Tweak this value to load rows into the track grids (default 50)",
            type: "number",
            defaultValue: 250,
			makeHandler: function(key, item){
				return function() {
                    Ext.MessageBox.prompt(item.text, item.description, function(btn, text){
                        if (Ext.isNumber(1 * text)) {
                            Ext.ux.mattgoldspink.subsonic.UserPrefsStore.set(key, text);
                            Ext.ux.mattgoldspink.subsonic.FolderTracksStore.rowCountToProcess = text;
                        } else {
                            Ext.MessageBox.alert('Invalid value', text + ' is not valid number');
                        }
                    });
				};
			}
        },
        "auto-expand-indexes": {
            text: "Auto Expand Indexes",
            type: "boolean",
            defaultValue: false
        },
		'use-html5-audio': {
            text: "Use HTML5 Audio",
            type: "boolean",
            defaultValue: false,
			checkHandler: function(item, checked) {
				Ext.ux.mattgoldspink.subsonic.UserPrefsStore.set('use-html5-audio', checked);
				soundManager.useHTML5Audio = checked;
				soundManager.reboot();
			}
        },
		'force-use-html5-for-mp3': {
            text: "Force MP3 playback to use HTML5 Audio (note: some browsers have poor mp3 support)",
            type: "boolean",
            defaultValue: false,
			checkHandler: function(item, checked) {
				Ext.ux.mattgoldspink.subsonic.UserPrefsStore.set('force-use-html5-for-mp3', checked);
				soundManager.html5Test = (checked ? /(probably|maybe)/i : /(probably)/i);
				soundManager.reboot();
			}
        }
    }
});
/*global window: false, soundManager: false*/
/*
 * #depends playlist-controller.js
 */
Ext.ns('Ext.ux.mattgoldspink.subsonic.controllers');

Ext.ux.mattgoldspink.subsonic.controllers.Playlist = function(){
    // setup msg bus
    this.msgbus = new Ext.ux.MsgBus();
    this.msgbus.init(this);
    this.subscribe('subsonic.playlist.created', {
        scope: this,
        fn: this.createPlaylist
    });
	this.subscribe('subsonic.playlist.track.added', {
        scope: this,
        fn: this.trackAdded
    });
	this.subscribe('subsonic.playlist.track.removed', {
        scope: this,
        fn: this.trackRemoved
    });
	this.subscribe('subsonic.playlist.renamed', {
        scope: this,
        fn: this.playlistRenamed
    });
};

Ext.apply(Ext.ux.mattgoldspink.subsonic.controllers.Playlist.prototype, {
    createPlaylist: function(subject, playlist) {
		// it has to have one track before it can be added to the server so we cache it locally first
		var newPlaylists = Ext.ux.mattgoldspink.subsonic.UserPrefsStore.get('unsaved-playlists', []);
		newPlaylists.push(playlist.name);
		Ext.ux.mattgoldspink.subsonic.UserPrefsStore.get('unsaved-playlists', newPlaylists);
	},
	trackAdded: function(subject, data) {
		var playlistName = data.name, playlistId = data.playlistId, songId = [];
		Ext.each(data.songs, function(song) {
			songId.push(song.id);
		});
		var baseParams = Ext.apply({
			songId: songId
		}, Ext.ux.mattgoldspink.subsonic.LoginDetails);
		if (playlistId && Ext.ux.mattgoldspink.subsonic.isVersionGreaterThan(window.subtunes.serverVersion, "1.4.0")) {
			baseParams.playlistId = playlistId;
		} else {
			baseParams.name = playlistName;
		}
		if (playlistId) {
            this.getExistingTracksForPlaylist(playlistId, function(response, options){
                var json = response.responseData;
                if (!Ext.isArray(json.playlist.entry)) {
                    json.playlist.entry = [json.playlist.entry];
                }
                var cacheExistingIds = baseParams.songId;
                baseParams.songId = [];
                Ext.each(json.playlist.entry, function(item){
                    baseParams.songId.push(item.id);
                });
                Ext.each(cacheExistingIds, function(item){
                    baseParams.songId.push(item);
                });
                this.doCreatePlaylistCall(baseParams, this.handleTrackAddSuccess);
            });
        }else {
	        this.doCreatePlaylistCall(baseParams, this.handlePlaylistCreatedSuccess);
	    }
	},
	doCreatePlaylistCall: function(baseParams, success) {
	    Ext.Ajax.request({
		    url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/createPlaylist.view',
		    params: baseParams,
            method: 'GET',
		    success: Ext.isEmpty(success)? this.handleTrackAddSuccess : success,
		    scope: this,
		    failure: this.handleTrackAddFailure
	    });
	},
	getExistingTracksForPlaylist: function(playlistId, executeOnResponse) {
		Ext.Ajax.request({
			url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getPlaylist.view',
			params: Ext.apply({
			        id: playlistId
		        }, Ext.ux.mattgoldspink.subsonic.LoginDetails),
            method: 'GET',
			success: executeOnResponse,
			scope: this,
			failure: this.handleTrackAddFailure
		});
	},
	handlePlaylistCreatedSuccess: function(response, options) {
	    this.publish('subsonic.playlist.created.success', options.params.name);
	},
	handleTrackAddSuccess: function(response, options) {
		this.publish('subsonic.playlist.updated.success', options.params.playlistId);
	},
	handleTrackAddFailure: function(response, options) {
		//alert('epic fail');
	},	
	trackRemoved: function(subject, data) {
	
	},
	makeDoDeletePlaylistCall: function(playlistId) {
	    return function(response, options){
           if (response.responseData.status === 'ok') {
	            Ext.Ajax.request({
			        url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/deletePlaylist.view',
			        params: Ext.apply({
			                id: playlistId
		                }, Ext.ux.mattgoldspink.subsonic.LoginDetails),
                    method: 'GET',
			        success: this.handleDeleteSuccess,
			        scope: this,
			        failure: this.handleDeleteFailure
		        });
	        }
	    };
	},
	handleDeleteFailure: function(response, options) {
	
	},
	handleDeleteSuccess: function(response, options) {
	    this.publish('subsonic.playlist.renamed.success', options.params);
	},
	playlistRenamed: function(subject, data) {
        this.getExistingTracksForPlaylist(data.id, function(response, options){
	        var json = response.responseData, baseParams = Ext.apply({
                name: data.text,
                songId: []
            }, Ext.ux.mattgoldspink.subsonic.LoginDetails);
            if (!Ext.isArray(json.playlist.entry)) {
                json.playlist.entry = [json.playlist.entry];
            }
            Ext.each(json.playlist.entry, function(item) {
                baseParams.songId.push(item.id);
            });
	        this.doCreatePlaylistCall(baseParams, this.makeDoDeletePlaylistCall(data.id));
	    });
	}
});
Ext.ux.mattgoldspink.subsonic.controllers.Playlist.singleton = new Ext.ux.mattgoldspink.subsonic.controllers.Playlist();
/*global window: false*/
/*
 * #depends subsonic-autodetect.js
 * #depends user-preferences-store.js
 */
Ext.ns('Ext.ux.mattgoldspink.subsonic');

Ext.ux.mattgoldspink.subsonic.Login = function(){
    Ext.state.Manager.setProvider(Ext.ux.mattgoldspink.subsonic.UserPrefsStore);
    
    if (Ext.state.Manager.get('u') === undefined || Ext.state.Manager.get('p') === undefined) {
        var loc = window.location;
        var loginWindow = new Ext.Window({
            title: 'Login',
            closable:false,
            width:370,
            plain:true,
            plugins: ['msgbus'],
            items: [
                {
                    xtype: 'form',
                    labelWidth: 75,
                    bodyStyle:'padding:5px 5px 0',
                    width: 350,
                    defaults: {width: 230},
                    items: [
                        {
                            xtype: 'textfield',
                            name: 'apiurl',
                            fieldLabel: 'Detected API URL',
                            value: loc.protocol + '//' + loc.host + Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/ping.view',
                            disabled: true
                        },
                        {
                            xtype: 'textfield',
                            name: 'username',
                            fieldLabel: 'Enter your username',
                            allowBlank: false    
                        }, {
                            xtype: 'textfield',
                            inputType:'password',
                            name: 'password',
                            fieldLabel: 'Enter your password',
                            allowBlank: false,
                            enableKeyEvents: true,
                            listeners: {
                                specialkey: function(field, e){
                                    if (e.getKey() == e.ENTER) {
                                        var button = field.ownerCt.buttons[0];
                                        button.handler.call(button, button);
                                    }
                                }
                            }
                        }
                    ],
                    buttons: [{
                        text: 'Log in',
                        formBind: true,
                        handler: function(button){
                            var form = button.ownerCt.ownerCt.getForm(), values, username, password;
                            values = form.getValues();
                            username = values.username;
                            password = values.password;
                            Ext.MessageBox.show({
                               msg: 'Verifying your username and password',
                               progressText: 'Checking',
                               width:300,
                               wait:true,
                               waitConfig: {interval:200}
                               });
                               var params = {
                                   'u': username,
                                'p': 'enc:'+Ext.ux.mattgoldspink.subsonic.hexEncode(password)
                            };
                            Ext.apply(params, Ext.ux.mattgoldspink.subsonic.LoginDetails);
                            Ext.Ajax.request({
                               url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/ping.view',
                               success: function(response) {
                                    var status = response.responseData.status;
                                    var error = response.responseData.error;
                                    if (status === 'ok' && !Ext.isDefined(error)) {
                                           Ext.state.Manager.set('u', username);
                                        Ext.state.Manager.set('p', Ext.ux.mattgoldspink.subsonic.hexEncode(password));
                                        Ext.ux.mattgoldspink.subsonic.LoginDetails.u = Ext.state.Manager.get('u');
                                        Ext.ux.mattgoldspink.subsonic.LoginDetails.p = 'enc:'+Ext.state.Manager.get('p');
                                        Ext.MessageBox.hide();
                                        loginWindow.close();
                                        loginWindow.publish('subsonic.login.ok', Ext.ux.mattgoldspink.subsonic.LoginDetails);
                                    } else {
                                        Ext.MessageBox.hide();
                                        Ext.MessageBox.setIcon(Ext.MessageBox.ERROR);
                                        Ext.MessageBox.alert('Error code: '+response.responseData.error.code, 'There was an error logging in:<br/>'+response.responseData.error.message, function(){
                                           form.reset(); 
                                        });
                                    }                            
                               },
                               failure: Ext.ux.mattgoldspink.subsonic.Login,
                               params: params
                            });
                            
                        }
                    }]
                }
            ]
        }).show();
    } else {
        Ext.ux.mattgoldspink.subsonic.LoginDetails.u = Ext.state.Manager.get('u');
        Ext.ux.mattgoldspink.subsonic.LoginDetails.p = 'enc:'+Ext.state.Manager.get('p');
    }
};
/*global window: false*/
/*
 * #depends user-preferences-store.js
 * #depends new-version-window.js
 */
Ext.ns('Ext.ux.mattgoldspink.subsonic');

Ext.ux.mattgoldspink.subsonic.BottomBar = Ext.extend(Ext.Panel, {
    constructor: function(config) {
        Ext.apply(config, {
            cls: 'bottombar',
            plugins: ['msgbus'],
            bbar : new Ext.ux.StatusBar({
				id: 'bottombar',
                statusAlign: 'left',
                text: 'Ready',
                ref: 'status',
                iconCls: 'x-status-valid',
                items: [
					{
						iconCls: 'createPlaylist',
						cls: 'left createPlaylist',
						enableToggle: false,
						handler: this.addNewPlaylist,
						scope: this,
                        style: {
                            position: 'absolute',
                            left: '0px',
                            top: '0px'
                        }
					},
                    {
                        iconCls: 'shuffle',
						cls: 'left shuffle',
						enableToggle: true,
                        handler: this.handleShuffle,
						scope: this,
                        style: {
                            position: 'absolute',
                            left: '30px',
                            top: '0px'
                        }
                    },
                    { 
                        iconCls: 'repeat',
						cls: 'left repeat off',
						enableToggle: false,
                        handler: this.handleRepeat,
						scope: this,
                        style: {
                            position: 'absolute',
                            left: '60px',
                            top: '0px'
                        }
                    },
                    {
                        iconCls: 'cfg',
                        menu: this.makeSettingsMenu()
                    },
                    {
                        text: 'Get Subtunes for Android',
                        iconCls: 'android',
                        handler: function(){
                            window.open('https://play.google.com/store/apps/details?id=com.runners_id.android.superampify', '_blank');
                        },
                        style: {
                            marginLeft: '5px'
                        }
                    },
                    {
                        text: 'About Subtunes '+Ext.ux.mattgoldspink.subsonic.subTunesVersion,
                        handler: this.launchAbout
                    },
                ]
            })
        });
        Ext.ux.mattgoldspink.subsonic.BottomBar.superclass.constructor.apply(this, arguments);
        this.setupSubscriptions();
    },
    launchAbout: function(){
        new Ext.ux.mattgoldspink.subsonic.NewVersionWindow({}).show();
    },
    setupSubscriptions: function(){
        this.subscribe('subsonic.status', {
            fn: this.handleStatusUpdate,
            scope: this
        });
        this.subscribe('subsonic.status.clear', {
            fn: this.handleStatusClear,
            scope: this
        });
    },
	addNewPlaylist: function(){
		this.publish('subsonic.playlist.created', true);
	},
	handleRepeat: function(button, e){
		var toBeRemoved, toBeAdded, btnEl = button.getEl();
		if (btnEl.hasClass('off')) {
			toBeRemoved = 'off';
			toBeAdded = 'all';
		} else if (btnEl.hasClass('all')) {
			toBeRemoved = 'all';
			toBeAdded = 'one';
		} else {
			toBeRemoved = 'one';
			toBeAdded = 'off';
		}
		btnEl.removeClass(toBeRemoved);
		btnEl.addClass(toBeAdded);
		this.publish('subsonic.player.repeat', toBeAdded);
	},
	handleShuffle: function(){
		this.publish('subsonic.player.shuffle.toggle', true);
	},
    handleStatusClear: function(subject, msg) {
        this.getBottomToolbar().clearStatus({useDefaults:true});
    },
    handleStatusUpdate: function(subject, msg) {
        this.getBottomToolbar().showBusy();
        this.getBottomToolbar().setStatus({
            text: msg.text
        });
    },
    makeSettingsMenu: function(){
        var items = [], me = this;
        $.each(Ext.ux.mattgoldspink.subsonic.UserPrefsStore.defaults, function(key, val) {
            var item = Ext.apply({}, val);
            if (item.type === "boolean") {
                item.checked = Ext.ux.mattgoldspink.subsonic.UserPrefsStore.get(key);
				if (!Ext.isDefined(item.checkHandler)) {
					item.checkHandler = me.makeCheckHandler(key);
				}
            } else if (item.type === "string" || item.type === "number") {
				if (Ext.isDefined(item.makeHandler)) {
					item.handler = item.makeHandler(key, item);
				} else {
					item.handler = me.makeStringHandler(key, item);
				}
			}
            items.push(item);
        });
        return new Ext.menu.Menu({
            items: items
        });
    },
	makeStringHandler: function(key, item) {
		return function() {
			Ext.MessageBox.prompt(item.text, item.description, function(btn, text){
				Ext.ux.mattgoldspink.subsonic.UserPrefsStore.set(key, text);
			});
		};
	},
    makeCheckHandler: function(key){
        return function(item, checked) {
            Ext.ux.mattgoldspink.subsonic.UserPrefsStore.set(key, checked);
        };
    }
});
/*
 * #depends user-preferences-store.js
 */
/*global window: false*/
Ext.ux.mattgoldspink.subsonic.FolderTracksStore = new Ext.data.ArrayStore({
    // reader configs
    restful: true,
    autoDestroy: false,
    idIndex: 0,
    sortInfo: {
        field: 'album',
        direction: 'ASC'
    },
    fields: Ext.ux.mattgoldspink.subsonic.Fields,
    loadingIcon:new Ext.XTemplate(
        'Loading... Rendered {rowsRendered} of {rowsRemaining} rows'
    ),
    workerCount: 10,
    rowCountToProcess: Ext.ux.mattgoldspink.subsonic.UserPrefsStore.get('track-grid-batch-size', 50),
    currentWorker: 0,
    pendingRecords: [],
    getNextWorker: function(){
        if (++this.currentWorker >= this.workerCount) {
            this.currentWorker = 0;
        }
        return $.Hive.get(this.currentWorker);
    },
    removeAllIncludingPending: function(){
		this.requestId = Ext.id();
        this.pendingRecords = [];
        this.removeAll();
    },
    load: function(data){
        this.workerLoad(data.params.id, false, true);
    },
	setPlaylistMode: function(){
		this.url = Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getPlaylist.view';
	},
	setFolderMode: function(){
		this.url = Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getMusicDirectory.view';
	},
    search: function(searchString, searchType) {
        this.fireEvent('beforeload', this);
        this.removeAllIncludingPending();
        this.getNextWorker().send({ 
            "message" : {
                "c": Ext.ux.mattgoldspink.subsonic.LoginDetails.c,
                "v": Ext.ux.mattgoldspink.subsonic.LoginDetails.v,
                "u": Ext.ux.mattgoldspink.subsonic.LoginDetails.u,
                "p": Ext.ux.mattgoldspink.subsonic.LoginDetails.p,
                "f" : 'json',
                "artistCount" : 200,
				"albumCount" : 200,
				"songCount" : 200,
                "query" : searchString+'*'
            },
            "url" : Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/search2.view',
			"searchType": searchType,
			"requestId": this.requestId
        });            
    },
    workerLoad: function(id, add, recursive) {
        this.fireEvent('beforeload', this);
        if ((add === false || add === undefined) && this.data) {
            this.removeAllIncludingPending();
        }
        this.getNextWorker().send({ 
            "message" : {
                "c": Ext.ux.mattgoldspink.subsonic.LoginDetails.c,
                "v": Ext.ux.mattgoldspink.subsonic.LoginDetails.v,
                "u": Ext.ux.mattgoldspink.subsonic.LoginDetails.u,
                "p": Ext.ux.mattgoldspink.subsonic.LoginDetails.p,
                "id" : id,
                "f" : 'json'
            },
            "url" : this.url, 
            "recursive": recursive,
			"requestId": this.requestId
        });
    },
    processPendingRecords: function(){        
        var i = (this.pendingRecords.length >= this.rowCountToProcess? this.rowCountToProcess: this.pendingRecords.length ), records = [];
        if (i > 0) {
            var totalCount = this.getCount();
            window.Ext.ux.Bus.fireEvent('message', 'subsonic.status', {
                 text: this.loadingIcon.apply({'rowsRendered': totalCount, 'rowsRemaining': this.pendingRecords.length + totalCount})
            });
            Ext.each(this.pendingRecords.splice(0, i), function(item) {
                var rec = new Ext.ux.mattgoldspink.subsonic.FolderTracksStore.recordType(item, item.id);
                if (rec !== undefined) {
                    records.push(rec);
                }
            });
            if (records.length > 0) {
                this.add(records);
                var sortState = this.getSortState();
                this.sort(sortState.field, sortState.direction);
                this.fireEvent('load', this);
            }
          }
          if (this.pendingRecords.length === 0){
            window.Ext.ux.Bus.fireEvent('message', 'subsonic.status.clear', {});
          }
    },
    listeners: {
        load: function(store, records, options){
            Ext.each(records, function(record) {
                if (record.get('isDir')){
                    this.remove(record);
                }
            }, Ext.ux.mattgoldspink.subsonic.FolderTracksStore);
        }
    }
});

$.Hive.create({
	count: Ext.ux.mattgoldspink.subsonic.FolderTracksStore.workerCount,  
	worker: 'desktop/subsonic-worker-loader.js',
	receive: function (data) {
		if (data.results && data.requestId === Ext.ux.mattgoldspink.subsonic.FolderTracksStore.requestId) {
			Ext.each(data.results, function(item){
				if (item.isDir && data.recursive) {
					Ext.ux.mattgoldspink.subsonic.FolderTracksStore.workerLoad(item.id, true, data.recursive);
				} else if (data.requestId === Ext.ux.mattgoldspink.subsonic.FolderTracksStore.requestId) {
					Ext.ux.mattgoldspink.subsonic.FolderTracksStore.pendingRecords.push(item);
				}
			});
		}
	},
	error: function(e) {
	}
});

Ext.ux.mattgoldspink.subsonic.SelectedItem = new Ext.Panel({
    width: 250,
    height: 250,
    cls: 'album-view',
    title: 'Selected Item',
    tpl: new Ext.XTemplate(
        '<div class="thumb-wrap" id="{title}">',
        '<div class="thumb"><img src="{[ this.makeUrl(values.coverArt)]}" title="{title}" id="{id}" type="{isDir}" /></div>',
        '<span class="x-editable title">{title}</span>',
        '<span class="x-editable artist">{artist}</span>',
        '<span class="x-editable album">{album}</span>',
        '</div>',
        '<div class="x-clear"></div>',
        {
            makeUrl: function(coverArt) {
                var params = {
                    size: '100'
                };
                Ext.apply(params, Ext.ux.mattgoldspink.subsonic.LoginDetails);
                params.id = coverArt;
                return Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getCoverArt.view?' + Ext.urlEncode(params);
            }
        }),
   plugins: ['msgbus'],
   listeners: {
        afterrender: function(){
            this.subscribe('subsonic.track.nowplaying', {fn: function(subject, track){
                this.update(track);
            }, scope: this});
        }
   }
});

Ext.TaskMgr.start({
    run: Ext.ux.mattgoldspink.subsonic.FolderTracksStore.processPendingRecords,
    scope: Ext.ux.mattgoldspink.subsonic.FolderTracksStore,
    interval: 1000
});
/*
 * #depends web-worker-folder-store.js
 */
Ext.ns('Ext.ux.mattgoldspink.subsonic');

Ext.ux.mattgoldspink.subsonic.TrackGrid = Ext.extend(Ext.grid.GridPanel, {
    constructor: function(config) {
        Ext.apply(this, config, {
			store: Ext.ux.mattgoldspink.subsonic.FolderTracksStore,
			columns: [
				{header: ' ', width: 24, sortable: false, dataIndex: 'playstate', menuDisabled: true, hideable: false, renderer: function(value) {
					if (value === 'playing') {
						return '<img src="./icons/current-track-playing-icon.png" />';
					} else if (value === 'paused') {
						return '<img src="./icons/current-track-paused-icon.png" />';
					} else {
						return '';
					}
				}}, 
				{header: 'No.', width: 28, sortable: true, dataIndex: 'track', hidden: true},
				{header: 'Name', width: 225, sortable: true, dataIndex: 'title'},
				{header: 'Time', width: 75, sortable: true, dataIndex: 'duration', renderer: Ext.ux.mattgoldspink.subsonic.Util.renderTime},
				{header: 'Artist', width: 225, sortable: true, dataIndex: 'artist'},
				{header: 'Album', width: 225, sortable: true,  dataIndex: 'album'}
			],
			stripeRows: true,
			cls: 'tracklist-grid',
			trackMouseOver: false,
			deferRowRender: true,
			enableDrag: true,
			ddGroup: 'grid2tree',
			view: new Ext.ux.grid.BufferView({
				// render rows as they come into viewable area.
				scrollDelay: 10,
				rowHeight: 15,
				borderHeight: 0
			}),
			//sm: new Ext.grid.RowSelectionModel({singleSelect:true}),
			//loadMask: true,
			plugins: ['msgbus'],
			listeners: {
				scope: this,
				rowdblclick: function(grid, rowIndex, e) {
					var record = grid.getSelectionModel().getSelected();
					if (record.get('isDir') === 'true') {
						this.publish('subsonic.folder.click', record.data);
					} else {
						this.publish('subsonic.player.play.playlist', {
							tracks: this.getStore(),
							startAtTrack: rowIndex   
						});
					}
				},
				activate: function() {
					this.view.refresh();
				}
			}
		});
        Ext.ux.mattgoldspink.subsonic.TrackGrid.superclass.constructor.apply(this, arguments);
        this.setupSubscriptions();
    },
    setupSubscriptions: function(){
        this.subscribe('subsonic.track.nowplaying', {fn: function(subject, data) {
            var record = this.store.getById(data.id);
            if (record) {
                record.beginEdit();
                record.set('playstate', 'playing');
                record.endEdit();
            }
        }, scope: this});
        this.subscribe('subsonic.track.paused', {fn: function(subject, data) {
            var record = this.store.getById(data.id);
            if (record) {
                record.beginEdit();
                record.set('playstate', 'paused');
                record.endEdit();
            }
        }, scope: this});
        this.subscribe('subsonic.track.stopped', {fn: function(subject, data) {
            var record = this.store.getById(data.id);
            if (record) {
                record.beginEdit();
                record.set('playstate', '');
                record.endEdit();
            }
        }, scope: this});
		this.subscribe('subsonic.grid.jumpto', {
			scope: this,
			fn: this.handleGridJumpTo
		});
    } ,
	handleGridJumpTo: function(topic, item) {
		var id = item.id;
		var index = this.getStore().indexOfId(id);
		if (index > -1) {
			this.getView().focusRow(index);
			this.getSelectionModel().selectRow(index);
		}
	}
});
/*
 * #depends subsonic-login.js
 */

Ext.ns('Ext.ux.eskerda.subsonic');
Ext.ux.eskerda.subsonic.FolderLoader = Ext.extend(Ext.tree.TreeLoader, {
    constructor: function(config){
        Ext.apply(config, {
            url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getMusicFolders.view',
            baseParams: Ext.apply({}, Ext.ux.mattgoldspink.subsonic.LoginDetails),
            requestMethod: 'GET',
            nodeParameter: 'id',
            listeners: {
                beforeload:this.handleBeforeLoad,
                scope: this
            }
        });
        Ext.ux.eskerda.subsonic.FolderLoader.superclass.constructor.apply(this, arguments);
    },
    handleBeforeLoad: function(treeloader, node, callback){
        if (node.attributes.nextUrl !== undefined)
            this.url = node.attributes.nextUrl;
    },
    // private override
    processResponse : function(response, node, callback, scope){
        switch(this.url.substr(this.url.lastIndexOf('/')+1)){
            case "getMusicFolders.view":
                var data = response.responseData.musicFolders.musicFolder;
                if ( Object.prototype.toString.call( data ) !== '[object Array]'){
                    data = [ data ];
                }
                response.responseData = [];
                for (var i = 0 ; i < data.length; i++){
                    response.responseData.push({
                        id: data[i].id,
                        text: data[i].name,
                        leaf: false,
                        iconCls: 'music',
                        nextUrl: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getIndexes.view',
                        nextData: 'artist',
                        subject: 'subsonic.folder.click'
                    });
                }
                break;
            case "getIndexes.view":
                var artists = [];
                for (var i = 0; i < response.responseData.indexes.index.length; i++){
                    idx = response.responseData.indexes.index[i];
                    for (var j = 0 ; j < idx.artist.length; j++){
                        var artist = idx.artist[j];
                        artists.push(artist);
                    }
                }
                response.responseData = [];
                for (var a = 0; a < artists.length; a++){
                    response.responseData.push({
                        id: artists[a].id,
                        text: artists[a].name,
                        leaf: false,
                        iconCls: 'ipod',
                        nextUrl: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getMusicDirectory.view',
                        nextData: 'album',
                        subject: 'subsonic.folder.click'
                    })
                }
                break;
            case "getMusicDirectory.view":
                if (node.attributes.nextData == 'album'){
                    var albums = response.responseData.directory.child;
                    response.responseData = [];
                    for (var a = 0; a < albums.length; a++){
                        response.responseData.push({
                            id: albums[a].id,
                            text: albums[a].title,
                            leaf: false,
                            iconCls: 'ipod',
                            nextUrl: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getMusicDirectory.view',
                            nextData: 'song',
                            subject: 'subsonic.folder.click'
                        });
                    }
                } else {
                    // these are songs..
                    var songs = response.responseData.directory.child;
                    response.responseData = [];
                    for (var s = 0; s < songs.length; s++){
                        response.responseData.push({
                            id: songs[s].id,
                            text: songs[s].title,
                            leaf: true,
                            iconCls: 'music',
                            subject: 'subsonic.track.play'
                        });
                    }
                }
                break;

            case "getPlaylists.view":
                var playlists = response.responseData.playlists.playlist;
                response.responseData = [];
                for (var p = 0; p < playlists.length; p++){
                    response.responseData.push({
                        id: playlists[p].id,
                        text: playlists[p].name,
                        leaf: true,
                        iconCls: 'playlist',
                        playlist: true,
                        subject: 'subsonic.folder.click',
                        expanded: false,
                        loaded: true
                    });
                }
                break;
            default:
                console.log("-- Unset node case --");
                console.log(this.url);
                console.dir(response);
                break;
        };
        Ext.ux.eskerda.subsonic.FolderLoader.superclass.processResponse.apply(this, arguments);
    },
    createNode : function(attr){
        var me = this;
        return Ext.ux.eskerda.subsonic.FolderLoader.superclass.createNode.call(me, attr);
     }
});

/*
 * #depends subsonic-login.js
 */
/**
 * We can override the below since we know that responseData will contain the parsed json (and have the 'subsonic-response' tag
 * removed which seems to cause Ext some problems (TODO: report as a bug to sencha)
 */
Ext.data.JsonReader.prototype.read = function(response) {
    var json = response.responseData;
	if (Ext.isDefined(this.preProcessResponse)) {
		this.preProcessResponse(json);
	}
    return this.readRecords(json);
};


/**
 * Defines a JSON based store for the Folder view on desktop.
 * Note this has to be a separate store form the track grid one because we only show current directory contents
 * and don't recurse into the sub directories.
 */
Ext.ux.mattgoldspink.subsonic.FolderViewStore = new Ext.data.JsonStore({
    url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getMusicDirectory.view',
    root: 'directory.child',
    baseParams: Ext.ux.mattgoldspink.subsonic.LoginDetails,
    restful: true,
    idProperty: 'id',
    fields: Ext.ux.mattgoldspink.subsonic.Fields
});
/*global window: false*/
/*
 * #depends subsonic-login.js
 */
Ext.ns('Ext.ux.mattgoldspink.subsonic.controllers');

Ext.ux.mattgoldspink.subsonic.controllers.Store = function(){
    // setup msg bus
    this.msgbus = new Ext.ux.MsgBus();
    this.msgbus.init(this);
    this.subscribe('subsonic.folder.click', {
        scope: this,
        fn: this.handleFolderClick
    });
    this.subscribe('subsonic.load.store', {
        scope: this,
        fn: this.handleLoadStore
    });
	this.subscribe('subsonic.search.store', {
        scope: this,
        fn: this.handleSearch
    });
	this.playlistJsonReader = new Ext.data.JsonReader(
		{
			root: 'playlist.entry',
			idProperty: 'id',
			fields: Ext.ux.mattgoldspink.subsonic.Fields
		}
	);
	this.folderJsonReader = new Ext.data.JsonReader(
		{
			root: 'directory.child',
			idProperty: 'id',
			fields: Ext.ux.mattgoldspink.subsonic.Fields
		}
	);
	this.searchJsonReader = new Ext.data.JsonReader(
		{
			root: 'searchResult2.match',
			idProperty: 'id',
			searchType: 'all',
			fields: Ext.ux.mattgoldspink.subsonic.Fields
		}
	);
	this.searchJsonReader.preProcessResponse = function(o) {
		var searchResult2 = o.searchResult2, results = [], searchType = this.searchType;
		if (searchType === 'all' || searchType === 'artist' && searchResult2.artist) {
			var artists = searchResult2.artist;
			results = results.concat(Ext.isArray(artists) ? artists : [artists]);
		}
		if (searchType === 'all' || searchType === 'album' && searchResult2.album) {
			var albums = searchResult2.album;
			results = results.concat(Ext.isArray(albums) ? albums : [albums]);
		}
		if (searchType === 'all' || searchType === 'song' && searchResult2.song) {
			var songs = searchResult2.song;
			results = results.concat(Ext.isArray(songs) ? songs : [songs]);
		}
		o.searchResult2.match = results;
	};
};

Ext.apply(Ext.ux.mattgoldspink.subsonic.controllers.Store.prototype, {
    getWebWorkerStore: function() {
        return Ext.ux.mattgoldspink.subsonic.FolderTracksStore;
    },
    getFolderViewStore: function() {
        return Ext.ux.mattgoldspink.subsonic.FolderViewStore;
    },
	handleSearch: function(topic, data) {
		this.getWebWorkerStore().search(data.text, data.searchType);
		this.getFolderViewStore().on('load', function(store, recs, options) {
			this.getFolderViewStore().reader = options.previousReader;
			this.getFolderViewStore().proxy.setUrl(options.previousUrl);
		}, this, {
			single: true,
			previousReader: this.getFolderViewStore().reader,
			previousUrl: this.getFolderViewStore().proxy.url
		});
		this.searchJsonReader.searchType =  data.searchType;
		this.getFolderViewStore().reader = this.searchJsonReader;
		this.getFolderViewStore().proxy.setUrl(Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/search2.view');
		this.getFolderViewStore().load({
			params: {
				query: data.text + '*',
				artistCount : (data.searchType === 'all' || data.searchType === 'artist' ? 200 : 0),
				albumCount :  (data.searchType === 'all' || data.searchType === 'album' ? 200 : 0),
				songCount : (data.searchType === 'all' || data.searchType === 'song' ? 200 : 0)
			}
		});
	},
    handleFolderClick: function(topic, data) {
        if (data.playlist) {
			this.getWebWorkerStore().setPlaylistMode();
			this.getFolderViewStore().proxy.setUrl(Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getPlaylist.view');
			this.getFolderViewStore().reader = this.playlistJsonReader;
        } else {
			this.getFolderViewStore().proxy.setUrl(Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getMusicDirectory.view');
			this.getFolderViewStore().reader = this.folderJsonReader;
			this.getWebWorkerStore().setFolderMode();
        }
        window.Ext.ux.Bus.fireEvent('message', 'subsonic.load.store', data);
    },
    handleLoadStore: function(topic, data){
		this.getFolderViewStore().load({
			params: {
				id: data.id
			}
		});
        this.getWebWorkerStore().load({
            params: {
                id: data.id
            }
        });
    }
});

Ext.ux.mattgoldspink.subsonic.controllers.Store.singleton = new Ext.ux.mattgoldspink.subsonic.controllers.Store();
/*global window: false, soundManager: false*/
/*
 * #depends subsonic-login.js
 */
Ext.ns('Ext.ux.mattgoldspink.subsonic.controllers');

Ext.ux.mattgoldspink.subsonic.controllers.Player = function(){
    // setup msg bus
    this.msgbus = new Ext.ux.MsgBus();
    this.msgbus.init(this);
    this.subscribe('subsonic.player.play.playlist', {
        scope: this,
        fn: this.playTracks
    });
    this.subscribe('subsonic.player.play', {
        scope: this,
        fn: this.resumeCurrent
    });
    this.subscribe('subsonic.player.pause', {
        scope: this,
        fn: this.pauseCurrent
    });
    this.subscribe('subsonic.player.stop', {
        scope: this,
        fn: this.stopCurrent
    });
    this.subscribe('subsonic.player.forward', {
        scope: this,
        fn: this.skipCurrent
    });
    this.subscribe('subsonic.player.back', {
        scope: this,
        fn: this.skipBackward
    });
    this.subscribe('subsonic.player.skipto', {
        scope: this,
        fn: this.skipInto
    });
    this.subscribe('subsonic.player.volume.set', {
        scope: this,
        fn: this.setVolume
    });
    this.subscribe('subsonic.player.internal.doOnFinish', {
        scope: this,
        fn: this.doOnFinish
    });
    this.subscribe('subsonic.player.shuffle.toggle', {
        scope: this,
        fn: this.doShuffleToggle
    });
    this.subscribe('subsonic.player.repeat', {
        scope: this,
        fn: this.handleRepeat
    });
};

/**
 * Player controller
 * Publishes:
    subsonic.track.playlist
    subsonic.track.nowplaying
    subsonic.track.skippedTo
    subsonic.track.stopped
    subsonic.track.volume.change
 * Subscribes to:
    subsonic.player.start
    subsonic.player.stop
    subsonic.player.forward
    subsonic.player.back
    subsonic.player.skipto
    subsonic.player.volume.set
 */
Ext.apply(Ext.ux.mattgoldspink.subsonic.controllers.Player.prototype, {
    playbuttons: [],
    currentPlaylist: [],
    currentTrackId: undefined,
    volume: undefined,
	shuffle: false,
	repeatMode: 'off',
    setVolume: function(subject, value){
        this.volume = value;
        if (Ext.isDefined(this.currentTrackId)) {
            soundManager.setVolume(this.currentTrackId, value);
        }
        Ext.each(this.currentPlaylist, function(track){
            track.setVolume(value);
        });
    },
    playTracks: function(subject, options) {
        var tracks = options.tracks, startAtTrack = options.startAtTrack;
        this.disposeOfCurrent();
        tracks.each(function(track, index) {
            var id = track.get('id');
            var sound = soundManager.createSound({
                id: 'music' + id,
                url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/stream.view?' + Ext.urlEncode(Ext.ux.mattgoldspink.subsonic.LoginDetails) +'&id='+id,
                autoLoad: (index === startAtTrack),
                autoPlay: (index === startAtTrack),
                trackdata: track.data,
                onplay: this.handleOnPlay,
                onresume: this.handleOnPlay,
                onpause: this.handleOnPause,
                onfinish: this.handleOnFinish,
                onstop: this.handleOnStop,
                whileplaying: this.handleWhilePlaying,
                volume: this.volume
            });
            if (index === startAtTrack){
                this.currentTrackId = 'music' + id;
            }
            this.currentPlaylist.push(sound);
        }, this);
    },
    disposeOfCurrent: function(){
        Ext.each(this.currentPlaylist, function(track){
            try {
                track.stop();
                track.destruct();
            } catch(e) {
            }
        });
        this.currentPlaylist = [];
    },
    skipInto: function(subject, position) {
        var csound = soundManager.getSoundById(this.currentTrackId);
        if (csound.durationEstimate > csound.duration){
            d = csound.durationEstimate
        } else {
            d = csound.duration;
        }
        soundManager.setPosition(this.currentTrackId, d * position / 100);
    },
    resumeCurrent: function(){
        if (Ext.isDefined(this.currentTrackId) && Ext.isDefined(this.currentPlaylist)){
            var current = soundManager.getSoundById(this.currentTrackId);
            if(current.playState === 0) {
                current.play();
            } else {
                current.resume();    
            }
            current.setVolume(this.volume);
        }
    },
    pauseCurrent: function(){
        soundManager.pause(this.currentTrackId);
    },
    stopCurrent: function(){
        soundManager.stop(this.currentTrackId);
    },
    skipCurrent: function() {
        if (Ext.isDefined(this.currentTrackId) && Ext.isDefined(this.currentPlaylist)){
            var current = soundManager.getSoundById(this.currentTrackId);
            if (!current.paused) {
                current.stop();
            }
            this.doOnFinish('', current, true);
        }
    },
    skipBackward: function() {
        if (Ext.isDefined(this.currentTrackId) && Ext.isDefined(this.currentPlaylist)){
            // if more than 3 sec in restart song
            var current = soundManager.getSoundById(this.currentTrackId);
            if (current.position /1000 > 3) {
                soundManager.setPosition(this.currentTrackId, 0);
            } else {
                for (var i = 0; i < this.currentPlaylist.length; i++) {
                    var track = this.currentPlaylist[i];
                    if (track === current) {
                        if (i-1 > -1) {
                            var nextTrack = this.currentPlaylist[i-1];
                            soundManager.stop(this.currentTrackId);
                            soundManager.play(nextTrack.sID);
                            this.currentTrackId = nextTrack.sID;
                        return;
                        } else {
                            soundManager.setPosition(this.currentTrackId, 0);
                        }
                    }
                }
            }
        }
    },
    handleOnPlay: function(){
        this.setVolume(this.volume);
        window.Ext.ux.Bus.fireEvent('message', 'subsonic.track.nowplaying', this.options.trackdata);
    },
    handleOnPause: function() {
        window.Ext.ux.Bus.fireEvent('message', 'subsonic.track.paused', this.options.trackdata);
    },
    handleOnStop: function() {
        window.Ext.ux.Bus.fireEvent('message', 'subsonic.track.stopped', this.options.trackdata);
    },
    handleWhilePlaying: function(){
        window.Ext.ux.Bus.fireEvent('message', 'subsonic.track.whileplaying', this.position);
    },
    doOnFinish: function(subject, doneTrack, skipping){
		var nextTrack;
		if (!skipping && this.repeatMode === 'one') {
			nextTrack = doneTrack;
		} else if (!this.shuffle) {
			for (var i = 0; i < this.currentPlaylist.length; i++) {
				var track = this.currentPlaylist[i];
				if (track === doneTrack && i+1 < this.currentPlaylist.length) {
					nextTrack = this.currentPlaylist[i+1];
					break;
				}
			}
			if (nextTrack === undefined && this.repeatMode === 'all') {
				nextTrack = this.currentPlaylist[0];
			}
		} else {
			var total = this.currentPlaylist.length, nextIndex = Math.floor(Math.random()*total);
			nextTrack = this.currentPlaylist[nextIndex];
		}
		if (!doneTrack.paused) {
			if (!skipping || (skipping && doneTrack.playState !== 1)) {
				if (!skipping) {
					this.handleOnStop.apply(doneTrack, []);
				}
				if (nextTrack) {
					nextTrack.play();
				}
			}
		} else {
			if (doneTrack.playState === 0) {
				this.handleOnStop.apply(doneTrack, []);
			} else {
				doneTrack.stop();
			}
			if (nextTrack) {
				nextTrack.load();
				nextTrack.pause();
			}
		}
		if (nextTrack) {
			this.currentTrackId = nextTrack.sID;
		} else {
			this.currentTrackId = this.currentPlaylist[0].sID;
		}
    },
    handleOnFinish: function() {
        window.Ext.ux.Bus.fireEvent('message', 'subsonic.player.internal.doOnFinish', this);
    },
	doShuffleToggle: function(subject, data) {
		this.shuffle = !this.shuffle;
	},
	handleRepeat: function(subject, data) {
		this.repeatMode = data;
	}
});
Ext.ux.mattgoldspink.subsonic.controllers.Player.singleton = new Ext.ux.mattgoldspink.subsonic.controllers.Player();/*
 * #depends player-controller.js
 */
Ext.ns('Ext.ux.mattgoldspink.subsonic.Util');

Ext.ux.mattgoldspink.subsonic.Util.renderTime = function(time){
    return Ext.util.Format.number((time / 60), '0') + ':' + Ext.util.Format.number((time % 60)/100, '.00').substring(2);
};

Ext.ux.mattgoldspink.subsonic.Display = Ext.extend(Ext.Container, {
    display: undefined,
    currentTrackTpl: new Ext.XTemplate(
        '<div class="current-track">',
            '<div class="title">{title}</div>',
            '<div class="scroller-container">',
            '<div class="artist">{artist} &mdash; {album}</div>',
            '</div>',
            '<div class="current-position">',
            '<div class="current-time">0:00</div>',
            '<div class="position"></div>',
            '<div class="remaining-time">-{[Ext.ux.mattgoldspink.subsonic.Util.renderTime(values.duration)]}</div>',
            '</div>',
        '</div>'
    ),
    emptyDisplay: function(){
        this.display.update('<img class="logo" src="'+Ext.BLANK_IMAGE_URL +'" />');
    },
    setProgress: function(subject, progress){
        progress = progress/1000;
        this.display.child('.current-time').update(Ext.ux.mattgoldspink.subsonic.Util.renderTime(progress));
        this.display.child('.remaining-time').update(Ext.ux.mattgoldspink.subsonic.Util.renderTime(this.slider.maxValue - progress));
        this.slider.setValue(progress, true);
    },
    showTrack: function(track){
        Ext.destroy(this.slider);
        this.display.update(this.currentTrackTpl.applyTemplate(track));
        this.slider = new Ext.Slider({
            renderTo: this.display.child('.position'),
                minValue: 0,
                maxValue: track.duration
        });
        this.slider.on('changecomplete', function(slider, e, thumb){
            this.publish('subsonic.player.skipto', (slider.getValue() / slider.maxValue)*100);
        }, this);
    },
    constructor: function(config) {
		Ext.apply(this, config,
			{
				html: "<div class='display'></div>",
				flex: 1,
				height: 50,
				cls: 'display-wrapper',
				plugins: ['msgbus']
			}
		);
		Ext.ux.mattgoldspink.subsonic.Display.superclass.constructor.apply(this, arguments);
		this.on('afterrender', function(){
			this.display = this.getEl().child('.display');
			this.display.boxWrap();
			this.emptyDisplay();
		}, this);
		this.subscribe('subsonic.track.nowplaying', {
			fn: function(topic, track){
				this.showTrack(track);
			},
			scope: this
		});
		this.subscribe('subsonic.track.paused', {
			fn: function(topic, track){
				this.showTrack(track);
			},
			scope: this
		});
		this.subscribe('subsonic.track.stopped', {
			fn: function(topic, track){
				this.emptyDisplay();
			},
			scope: this
		});
		this.subscribe('subsonic.track.whileplaying', {
			fn: this.setProgress,
			scope: this
		});
    }
});

Ext.ux.mattgoldspink.subsonic.SearchField = Ext.extend(Ext.form.TwinTriggerField, {
    initComponent : function(){
        Ext.ux.mattgoldspink.subsonic.SearchField.superclass.initComponent.call(this);
        this.on('keyup', function(field, event){
            if (Ext.isEmpty(field.getValue())) {
                this.triggers[1].hide();
            } else {
                Ext.get(this.triggers[1].dom).applyStyles('display: block');
            }
			this.publish('subsonic.search.store', {
				text: field.getRawValue(),
				searchType: field.getQueryType()
			});
        }, this);
    },
	plugins: ['msgbus'],
    ref: '../search',
    trigger1Class:'x-search-options-trigger',
    trigger2Class:'x-search-clear-trigger',
    width: 180,
    searchType: 'all',
    emptyText: 'Search Music',
    enableKeyEvents: true,
    hideTrigger2:true,
    onItemCheck : function(item, checked) {
        if (checked === true) {
            this.searchType = item.searchType;
            this.fireEvent('keyup', this);
        }
    },
    makeAndShowMenu: function(){
        if (this.menu === undefined){
            this.menu = new Ext.menu.Menu({
				items: [
                    // stick any markup in a menu
                    '<b class="menu-title">Search</b>',
                    {
                        text: 'All',
                        searchType: 'all',
                        checked: true,
                        group: 'searchType',
                        checkHandler: this.onItemCheck,
                        scope: this
                    }, {
                        text: 'Artist',
                        searchType: 'artist',
                        checked: false,
                        group: 'searchType',
                        checkHandler: this.onItemCheck,
                        scope: this
                    }, {
                        text: 'Album',
                        searchType: 'album',
                        checked: false,
                        group: 'searchType',
                        checkHandler: this.onItemCheck,
                        scope: this
                    }, {
                        text: 'Song',
                        searchType: 'song',
                        checked: false,
                        group: 'searchType',
                        checkHandler: this.onItemCheck,
                        scope: this
                    }
                ]
            });
       }
       this.menu.show(this.getEl());
    },
    onTrigger1Click : function(){
		this.makeAndShowMenu();
    },
    onTrigger2Click : function(){
        this.el.dom.value = '';
        this.triggers[1].hide();
    },
    getQueryType: function(){
		return this.searchType; 
    }
});

Ext.ux.mattgoldspink.subsonic.PlayerPanel = Ext.extend(Ext.Panel, {
    constructor: function(config) {
        Ext.apply(this, config,
            {
                title: '&nbsp;',
                plugins: ['msgbus'],
                bodyCssClass: 'subsonic-player',
                cls: 'subsonic-player',
                closable: true,
                height: 69,
                resizeable: true,
                layout: 'hbox',
                layoutConfig:{
                     padding: '0 15 0 15'   
                },
                defaults: {
            border: true
                },
                items: [
                    this.makePlayControlsContainer(),
                    this.makeVolumeSliderContainer(),
                    new Ext.ux.mattgoldspink.subsonic.Display(),
                    this.makeViewChooserContainer(),
                    this.makeSearchFieldContainer()
                ]
            }
        );
        Ext.ux.mattgoldspink.subsonic.PlayerPanel.superclass.constructor.apply(this, arguments);
        this.setupButtonSubscriptions();
        this.setupVolumeListeners();
    },
    setupVolumeListeners: function(){
		this.volume.on('drag', function(slider, e, thumb){
			this.publish('subsonic.player.volume.set', thumb.value);
        }, this);
		this.volume.on('dragstart', function(slider, e, thumb){
			this.publish('subsonic.player.volume.set', thumb.value);
        }, this);
		this.volume.on('changecomplete', function(slider, newvalue, thumb){
			this.publish('subsonic.player.volume.set', newvalue);
        }, this);
    },
    setupButtonSubscriptions: function(){
        this.subscribe('subsonic.track.nowplaying', {
            scope: this,
            fn: this.handleNowPlaying
        });
        this.subscribe('subsonic.track.paused', {
            scope: this,
            fn: this.handlePaused
        });
        this.subscribe('subsonic.track.stopped', {
            scope: this,
            fn: this.handleStopped
        });
    },
    handlePaused: function(subject, track) {
        this.backbutton.addClass('enable');
        this.forwardbutton.addClass('enable');
        this.playbutton.removeClass('enable');
        this.publish('subsonic.player.pause', true);
    },
    handleStopped: function(subject, track) {
        this.backbutton.removeClass('enable');
        this.playbutton.removeClass('enable');
        this.forwardbutton.removeClass('enable');
        this.publish('subsonic.player.stop', true);
    },
    handleNowPlaying: function(subject, track) {
        this.backbutton.addClass('enable');
        this.playbutton.addClass('enable');
        this.forwardbutton.addClass('enable');
        this.publish('subsonic.player.start', true);
    },
    makeSearchFieldContainer: function(){
        return {
            xtype: 'container',
         cls: 'search',
            width: 180,
            items: [
                new Ext.ux.mattgoldspink.subsonic.SearchField({})
        ]
        };
    },
    makeVolumeSliderContainer: function(){
        return {
            xtype: 'container',
            width: 130,
            items: [
                {
                width: 100,
                minValue: 0,
                maxValue: 100,
                value: 100,
                ref: '../volume',
                cls: 'volume',
                xtype: 'slider',
                stateful: true,
                stateId: 'subTunesVolume',
                plugins: ['msgbus'],
                stateEvents: ['dragend','click'],
                getState: function(){
                    return {value: this.getValue()};
                },
                applyState: function(state) {
                    this.setValue(state.value);
                    this.publish('subsonic.player.volume.set', state.value);
                }
            }
            ],
            listeners : {
                afterrender: function(){
                    this.volume.getEl().insertHtml('afterBegin', '<b class="volume-min"></b>');
                    this.volume.getEl().insertHtml('beforeEnd', '<b class="volume-max"></b>');
                },
                scope: this
            }
     };
    },
    makeViewChooserContainer: function(){
        return {
            ref: 'viewchooser',
            cls: 'viewchooser',
            xtype: 'container',
            width: 106,
            layout: 'hbox',
            defaults: {
                xtype: 'button',
                enableToggle: true,
                toggleGroup: 'viewchooser',
                listeners: {
                toggle: function(button, pressed) {
                    if (pressed && this.publish) {
                        this.publish('subsonic.view.change', button.initialConfig.cls);
                    }
                },
                scope: this
            },
            stateful: true,
                stateEvents: ['toggle'],
                getState: function(){
                    return {pressed: this.pressed};
                },
                applyState: function(state){
                    this.toggle(state.pressed);
                }
            },
            items: [
                {
                    iconCls: 'grid',
                    pressed: false,
                    cls: 'gridview',
                    stateId: 'gridview'
                },
                {
                    iconCls: 'album',
                    pressed: true,
                    cls: 'albumview',
                    stateId: 'albumview'
                }
            ]
        };
    },
    makePlayControlsContainer: function(){
        return {
            ref: 'controls',
            xtype: 'container',
            plugins: ['msgbus'],
            width: 160,
            html: '<div class="control-wrapper"><div class="controls"><img src="'+Ext.BLANK_IMAGE_URL+'" class="back-button" /><img src="'+Ext.BLANK_IMAGE_URL+'" class="play-button" /><img src="'+Ext.BLANK_IMAGE_URL+'" class="forward-button" /></div></div>',
            listeners: {
                afterrender: function(){
                    this.backbutton = this.controls.getEl().child('.back-button');
                    this.playbutton = this.controls.getEl().child('.play-button');
                    this.forwardbutton = this.controls.getEl().child('.forward-button');
                    this.backbutton.on('click', function(){
                        this.publish('subsonic.player.back', true);
                    }, this);
                    this.playbutton.on('click', function(){
                        if (this.playbutton.hasClass('enable')) {
                            this.publish('subsonic.player.pause', true);
                        } else {
                            this.publish('subsonic.player.play', true);
                        }
                    }, this);
                    this.forwardbutton.on('click', function(){
                        this.publish('subsonic.player.forward', true);
                    }, this);
                },
                scope: this
            }
        };
    }
});
/*
 * #depends folder-view-store.js
 */
Ext.ns('Ext.ux.mattgoldspink.subsonic');

Ext.ux.mattgoldspink.subsonic.FolderView = Ext.extend(Ext.Panel, {
    constructor: function(config) {
        Ext.apply(this, config, {
            layout:'card',
            id:'images-view',
            autoScroll: true,
            cls: 'album-view',
            plugins: ['msgbus'],
            activeItem: 0,
            items: [new Ext.DataView({
                store: Ext.ux.mattgoldspink.subsonic.FolderViewStore,
                ref: 'dataview',
                tpl: new Ext.XTemplate(
                    '<tpl for=".">',
                        '<div class="thumb-wrap" id="{title}">',
                        '<div class="thumb"><img src="{[ this.makeUrl(values.coverArt)]}" title="{title}" id="{id}" type="{isDir}" /></div>',
                        '<span class="x-editable album">{album}</span>',
                        '<span class="x-editable artist">{artist}</span>',
                        '<span class="x-editable title">{title}</span>',
                        '</div>',
                    '</tpl>',
                    '<div class="x-clear"></div>',
                    {
                        makeUrl: function(coverArt) {
                            var params = {
                                size: '100'
                            };
                            Ext.apply(params, Ext.ux.mattgoldspink.subsonic.LoginDetails);
                            params.id = coverArt;
                            return Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getCoverArt.view?' + Ext.urlEncode(params);
                        }
                    }
                ),
                multiSelect: true,
                overClass:'x-view-over',
                itemSelector:'div.thumb-wrap',
                emptyText: 'No folders to display',
                listeners: {
                    click: this.handleImgClick,
                    dblclick: this.handleImgDblClick,
                    scope: this
                }
            })
            ]
        });
        Ext.ux.mattgoldspink.subsonic.FolderView.superclass.constructor.apply(this, arguments);
    },
    handleImgDblClick: function(view, index, el, evt) {
        el = Ext.get(el).query('.thumb>img')[0];
        if (el.getAttribute('type') == 'true') {
            this.publish('subsonic.folder.click', {id: Ext.get(el).getAttribute('id')});
        } else {
			this.publish('subsonic.player.play.playlist', {
				tracks: view.getStore(),
				startAtTrack: view.getStore().indexOfId(Ext.get(el).getAttribute('id'))
			});
        }
    },
    handleImgClick: function(view, index, el, evt){
        el = Ext.get(el).query('.thumb>img')[0];
        if (el.getAttribute('type') == 'true') {
            this.publish('subsonic.folder.selected', {id: el.getAttribute('id')});
        }
    }   
});

/*
 * #depends tree-loader.js
 */

Ext.ns('Ext.ux.mattgoldspink.subsonic');        
Ext.ux.mattgoldspink.subsonic.FolderTreePanel = Ext.extend(Ext.tree.TreePanel, {
    constructor: function(config){
        Ext.apply(this, config, {
            autoScroll: true,
            plugins: ['msgbus'],
            rootVisible: false,
            root: this.makeInitialRoot(),
            // Our custom TreeLoader:
            loader: new Ext.ux.eskerda.subsonic.FolderLoader({}),
			enableDrop: true,
			ddGroup: 'grid2tree',
			ddScroll: true
        });
        Ext.ux.mattgoldspink.subsonic.FolderTreePanel.superclass.constructor.apply(this, arguments);
        this.setupListeners();
        this.setupSubscriptions();
    },
	initComponent: function(){
		Ext.ux.mattgoldspink.subsonic.FolderTreePanel.superclass.initComponent.apply(this);
		this.editor = new Ext.tree.TreeEditor(this);
		this.editor.on('beforestartedit', function(ed, boudnEl, value) {
			if (!ed.editNode.attributes.playlist) {
				return false;
			}
		});
		this.editor.on('complete', function(node, newValue, startValue) {
            if (!node.editNode.attributes.notYetCreated) {
			    this.publish('subsonic.playlist.renamed', {
			        id: node.editNode.id,
			        text: newValue
			    });
			}
		}, this);
	},
    setupSubscriptions: function(){
        this.subscribe('subsonic.folder.selected', {fn: this.handleFolderSelected, scope: this});
        this.subscribe('subsonic.login.ok', {fn: function(topic, data){
           this.getRootNode().item(0).reload();
        }, scope: this});
		this.subscribe('subsonic.playlist.created', {fn: this.handlePlaylistCreated, scope: this});
		this.subscribe('subsonic.playlist.created.success', {fn: this.handlePlaylistCreatedSuccess, scope: this});
		this.subscribe('subsonic.playlist.renamed.success', {fn: this.handlePlaylistCreatedSuccess, scope: this});
		this.subscribe('subsonic.playlist.updated.success', {fn: this.reloadPlaylist, scope: this});
    },
	reloadPlaylist: function(topic, data){
	
	},
	handlePlaylistCreatedSuccess: function(topic, data) {
	    var playlistNode = this.getNodeById('playlists');
	    playlistNode.reload();
	},
	handlePlaylistCreated: function(topic, data) {
		var playlistNode = this.getNodeById('playlists');
		playlistNode.expand(false, true, function() {
			var newNode = playlistNode.appendChild({
				name: 'untitled playlist',
				notYetCreated: true,
				playlist: true,
				leaf: true,
				iconCls: 'playlist'
			});
			newNode.select();
			this.editor.triggerEdit(newNode);
		}, this);
	},
    handleFolderSelected: function(topic, data){
        var node = this.getNodeById(data.id);
        if (Ext.isEmpty(node)){
            node = this.getSelectionModel().getSelectedNode();
            if (!Ext.isEmpty(node) && node.hasChildNodes()){
                this.getSelectionModel().getSelectedNode().expand(false, false, function(){
                    this.publish('subsonic.folder.selected', {id: data.id});
                }, this);
            }
        } else {
            node.expand();
            node.select();
        }
    },
    makeInitialRoot: function(){
        return {
            id: 'rootNode',
            nodeType: 'async',
            children: [
                {
                    text: 'Library',
                    id: 'library',
                    cls: 'library-node'    ,
                    expanded: true,
                    expandable: false,
                    nodeType: 'async',
                    nextUrl: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getMusicFolders.view',
                    nextRoot: 'musicFolders.musicFolder'
                },
                {
                    text: 'Playlists',
                    id: 'playlists',
                    cls: 'playlist-node',    
                    nodeType: 'async',
                    nextUrl: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getPlaylists.view',
                    nextRoot: 'playlists.playlist'
                 }
             ]
        };
    },
    setupListeners: function() {
        this.on('click', this.handleClick, this);
		this.on('beforenodedrop', this.handleBeforeNodeDrop, this);
		this.on('nodedragover', this.handleNodeDragOver, this);
    },
	handleBeforeNodeDrop: function(e) {
		e.cancel = false;
		var data = {songs: e.data.selections};
		data.name = e.target.text;
		if (!e.target.attributes.notYetCreated) {
			data.playlistId = e.target.id;
		}
		this.publish('subsonic.playlist.track.added', data);
		return true;
	},
	handleNodeDragOver: function(e) {
		if (!e.target.attributes.playlist) {
			e.cancel = true;
		}
	},
    handleClick: function(node, event) {
        if (Ext.isDefined(node.attributes.subject)){
			if (!node.attributes.notYetCreated){
				this.publish(node.attributes.subject, node.attributes);
			}
        } else {
            node.expand();
        }
    }
});

/*global ImageFlow: false, window: false*/
/*
 * #depends subsonic-trackgrid.js
 */
Ext.ns('Ext.ux.mattgoldspink.subsonic');
Ext.ux.mattgoldspink.subsonic.CoverFlowCount = 0;
Ext.ux.mattgoldspink.subsonic.CoverFlow = Ext.extend(Ext.Panel, {
    constructor: function(config) {
        Ext.apply(this, config, {
            layout: 'border',
            defaults: {
                split: false
            },
            plugins: ['msgbus'],
            items: [new Ext.DataView(
                {
                    cls: 'coverflow',
                    store:  Ext.ux.mattgoldspink.subsonic.FolderTracksStore, //Ext.ux.mattgoldspink.subsonic.FolderViewStore,
                    ref: 'dataview',
                    region: 'north',
                    tpl: new Ext.XTemplate(
                            '<div id="coverflow{[++Ext.ux.mattgoldspink.subsonic.CoverFlowCount]}" class="imageflow">',
                                '<tpl for=".">',
                                    '<img src="{[ this.makeUrl(values.coverArt)]}" longdesc="http://{[ this.makeUrl(values.coverArt)]}" height="50" width="50" alt="{title}" id="{id}" />',
                                '</tpl>',
                            '</div>',                 
                        {
                            makeUrl: function(coverArt) {
                                var params = {
                                    size: '180'
                                };
                                Ext.apply(params, Ext.ux.mattgoldspink.subsonic.LoginDetails);
                                params.id = coverArt;
                                return Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getCoverArt.view?' + Ext.urlEncode(params);
                            }
                        }
                    ),
                    multiSelect: true,
                    overClass:'x-view-over',
                    itemSelector:'img',
                    height: 360,
                    getCurrentId: function(){
                        return 'coverflow' + Ext.ux.mattgoldspink.subsonic.CoverFlowCount;
                    }
                }),
                {
                    xtype: 'panel',
                    layout: 'fit',
                    region: 'center',
                    items: new Ext.ux.mattgoldspink.subsonic.TrackGrid({autoWidth: true, ref: '../grid'})
                }
            ]
        });
        Ext.ux.mattgoldspink.subsonic.CoverFlow.superclass.constructor.apply(this, arguments);
        this.dataview.getStore().on('load', this.handleLoadCallback, this.dataview);
    },
    handleLoadCallback: function(){
        if (this.ownerCt.isVisible()) {
            delete this.pendingId;                
            new ImageFlow().init(this.ownerCt.getImageFlowConfig(this.getCurrentId()));
        } else {
            this.pendingId = this.getCurrentId();
            this.ownerCt.on('show', function(){
                if (this.pendingId) {
                    new ImageFlow().init(this.ownerCt.getImageFlowConfig(this.pendingId));
                    delete this.pendingId;
                 }
            }, this, {
                single: true
            });
        }
    },
    getImageFlowConfig: function(id) {
        return {
            ImageFlowID: id, 
            reflections: false,
            aspectRatio: 3.39, 
            imagesHeight: 0.75,
            reflectionP:0.0,
            imageFocusM: 0.85,
            startID:  1,
			onClick: function(){
				window.Ext.ux.Bus.fireEvent('message', 'subsonic.grid.jumpto', this);
			}
        }; 
    }     
});
/*global soundManager: false*/
/*
 * #depends subsonic-folder-tree.js
 * #depends subsonic-folderview.js
 * #depends subsonic-trackgrid.js
 * #depends subsonic-coverflow.js
 */
Ext.onReady(function(){	
	if (Ext.isDefined(Ext.ux.mattgoldspink.subsonic.notYetLoggedIn)) {
        Ext.ux.mattgoldspink.subsonic.Login();
	}
    var viewport = new Ext.Viewport({
        layout: 'border',
        items: [
            new Ext.ux.mattgoldspink.subsonic.FolderTreePanel({
                width: 200,
                split: true,
                flex: 1,
                id: 'leftbar',
                region: 'west'
            }),
            {
                layout: 'card',
                ref: 'corepanel',
                xtype: 'container',
                plugins: ['msgbus'],
                activeItem: 1,
                region: 'center',
                stateful: true,
                stateId: 'corepanel',
                stateEvents: ['afterlayout'],
                deferredRender: true,
                getState: function(){
                    return {
                        activeItem: this.layout.activeItem.id
                    };
                },
                applyState: function(state) {
                    this.activeItem  = state.activeItem;
                },
                items:    [
                    new Ext.ux.mattgoldspink.subsonic.TrackGrid({
                        id: 'gridview'
                    }),
                    new Ext.ux.mattgoldspink.subsonic.FolderView({
                        id: 'albumview'            
                    })
                ],
                listeners: {
                    afterrender: function(){
                        this.subscribe('subsonic.view.change', {fn: function(subject, view) {
                            this.layout.setActiveItem(view);
                        }, scope: this});
                    }
                }
            },
            new Ext.ux.mattgoldspink.subsonic.PlayerPanel({
                region: 'north'
            }),
            new Ext.ux.mattgoldspink.subsonic.BottomBar({
                region: 'south'
            })
        ]
    });
});
