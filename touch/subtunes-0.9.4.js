(function() {
    var application = new Ext.Application({
        name: 'Ext.ux.mattgoldspink.subsonic',
        defaultUrl: 'dashboard',
        launch: function(profile){
            //switch to json mode for everything
            Ext.ux.mattgoldspink.subsonic.LoginDetails.f = 'json';
            Ext.Router.draw(function(map) {
                map.connect('songView/[a-zA-Z0-9]+/[a-zA-Z0-9]+', {controller: 'Ext.ux.mattgoldspink.subsonic.controllers.SongView', action: 'loadFolder'});
				map.connect('', {controller: 'Ext.ux.mattgoldspink.subsonic.controllers.SongView', action: 'loadFolder'});
            });
        }
    });
})(); Ext.regModel('Ext.ux.mattgoldspink.subsonic.model.Menu', {
    idProperty: 'id',
    fields: ['id', 'name', 'iconCls'] 
});

Ext.ux.mattgoldspink.LeftMenuStore = Ext.extend(Ext.data.Store, {
    constructor: function(config){
		var params = {};
		Ext.apply(params, Ext.ux.mattgoldspink.subsonic.LoginDetails);
		Ext.apply(config, {
            model: 'Ext.ux.mattgoldspink.subsonic.model.Menu',
            id:'Ext.ux.mattgoldspink.subsonic.stores.LeftMenuStore',
			sorters: [
				{
					property: 'iconCls',
					direction: 'ASC'
				}, {
					property: 'name',
					direction: 'ASC'
				}],
            proxy: {
                type: 'ajax',
                url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getPlaylists.view',
                extraParams: params,
                requestMethod: 'GET',
                reader: this.makePlaylistReader()
            }
        });
		this.task = new Ext.util.DelayedTask(this.initLogin, this);
		this.task.delay(50);
        Ext.ux.mattgoldspink.LeftMenuStore.superclass.constructor.call(this, config);
    },
	initLogin: function(){
		if (!Ext.isEmpty(Ext.ux.mattgoldspink.subsonic.apiUrl)) {
			this.getProxy().url = Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getPlaylists.view';
		}
		if (!Ext.isEmpty(Ext.ux.mattgoldspink.subsonic.LoginDetails.u) && !Ext.isEmpty(Ext.ux.mattgoldspink.subsonic.LoginDetails.p)){
			Ext.apply(this.getProxy().extraParams, Ext.ux.mattgoldspink.subsonic.LoginDetails);
			this.load();
			delete this.task;
		} else {
			this.task.delay(50);
		}
	},
	load: function(options) {
		// do a call to get the MusicFolders too
		if (Ext.isEmpty(options)) {
			options = {};
		}
		options.callback = this.loadMusicFolders;
		options.scope = this;
		return Ext.ux.mattgoldspink.LeftMenuStore.superclass.load.call(this, options);
	},
	loadMusicFolders: function(options) {
		var params = Ext.apply({}, Ext.ux.mattgoldspink.subsonic.LoginDetails);
		Ext.Ajax.request({
            url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getMusicFolders.view',
            scope: this,
			params: params,
			success: function(data) {
			    data = Ext.decode(data.responseText);
                var status = data['subsonic-response'].status;
                if (status === 'ok') {
					var recs;
                    data = data['subsonic-response'];
					recs = data.musicFolders.musicFolder;
                    if (!Ext.isArray(recs)) {
                        data.musicFolders.musicFolder = [recs];
                    }
                    Ext.each(recs, function(rec){
                        rec.typeOfRequest = 'musicFolder';
						rec.iconCls = 'music';
                    });
					this.loadData(data.musicFolders.musicFolder, true);
				}
			}
		});
	},
    makePlaylistReader: function(){
        if (!Ext.isDefined(this.playlistReader)) {
            this.playlistReader = new Ext.data.JsonReader({
                root: 'playlists.playlist',
                getData: function(data){
                    var recs;
                    data = data['subsonic-response'];
					recs = data.playlists.playlist;
					if (!Ext.isArray(recs)) {
						recs = [recs];
					}
					data.playlists.playlist = recs;
					Ext.each(data.playlists.playlist, function(playlist) {
						if (!playlist.iconCls) {
							playlist.iconCls = 'playlist';
						}
					});
					return data;
                }
            });
        }
        return this.playlistReader;
    },
    makeMusicFolderReader: function(){
        if (!Ext.isDefined(this.musicFolderReader)) {
            this.musicFolderReader = new Ext.data.JsonReader({
                root: 'musicFolders.musicFolder',
                getData: function(data){
                    var recs;
                    data = data['subsonic-response'];
                    recs = data.musicFolders.musicFolder;
                    if (!Ext.isArray(recs)) {
                        data.musicFolders.musicFolder = [recs];
                    }
                    Ext.each(recs, function(rec){
                        rec.typeOfRequest = 'musicFolder';
                    });
                    return data;
                }
            });
        }
        return this.musicFolderReader;
    } 
});
/*
 * #depends subsonic-leftmenu-store.js
 */
Ext.ux.mattgoldspink.NowPlayingLeftPanel = Ext.extend(Ext.Panel, {
    constructor: function(config) {
        Ext.apply(config, {
			//hidden: true,
            dock: 'bottom',
			fit: true,
			height: 230,
			cls: 'now-playing',
			tpl: ['<h2>Now Playing:</h2>',
			'<img src="{[Ext.ux.mattgoldspink.subsonic.apiUrl]}/rest/getCoverArt.view?size=130&id={coverArt}&{[Ext.urlEncode(Ext.ux.mattgoldspink.subsonic.LoginDetails)]}" />',
			'<div class="song-meta">',
				'<div class="meta artist">{artist}</div>',
				'<div class="meta track">{name}</div>',
				'<div class="meta album">{album}</div>',
			'</div>'],
			listeners: {
				afterrender: this.hideEl,
				scope: this
			}
        });
        Ext.ux.mattgoldspink.NowPlayingLeftPanel.superclass.constructor.call(this, config);
		Ext.dispatch({
            controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
            action: 'registerPlayListener',
            listener: this
        });
		
    },
	hideEl: function(){
		Ext.defer(this.hide, 500, this, [{type: 'slide', direction: 'down'}]);
	},
	onPlay: function(track) {
		this.update(track.options.trackdata);
		this.show({type: 'slide', direction: 'up'});
		this.ownerCt.doLayout();
	}
});
/*
 * #depends subsonic-leftmenu-store.js
 */
Ext.ux.mattgoldspink.LeftMenuPanel = Ext.extend(Ext.Panel, {
    renderTpl: [
		'<h1>Library</h1><div class="{baseCls}-body <tpl if="bodyCls"> {bodyCls}</tpl>"<tpl if="bodyStyle"> style="{bodyStyle}"</tpl>></div>'
	],
    constructor: function() {
        Ext.apply(this, {
            title: 'Library',
            dock: 'left',
            cls: 'leftmenu',
            fit: true,
            layout: 'fit',
            dockedItems: [
                {
                    xtype: 'list',
                    store: new Ext.ux.mattgoldspink.LeftMenuStore({}),
                    itemTpl: '<div id="{id}" class="entry {iconCls}">{name}</div>',
					allowDeselect: false,
					singleSelect: true,
					sorters: 'iconCls',
                    listeners: {
                        itemtap: this.handleTap,
						afterrender: this.initialiseSelectedItem,
						scope: this
                    },
                    fit: true,
					dock:'top', 
                    selectedItemCls: 'selected'
                },
			    new Ext.ux.mattgoldspink.NowPlayingLeftPanel({
					dock: 'bottom'
				})]
        });
        Ext.ux.mattgoldspink.LeftMenuPanel.superclass.constructor.call(this);
    }, 
	initialiseSelectedItem: function(list) {
		Ext.dispatch({
			controller: 'Ext.ux.mattgoldspink.subsonic.controllers.SongView',
			action: 'initLeftBar',
			leftBar : list
		});
	}, 
    handleTap: function(dataView, index, element, e) {
		element = Ext.get(Ext.get(element).query('.entry')[0]);
		var id = element.id;
        if (element.hasCls('music')) {
            Ext.dispatch({
                controller: 'Ext.ux.mattgoldspink.subsonic.controllers.SongView',
                action: 'loadFolder',
				historyUrl: 'songView/musicFolder/' + id
            });
        } else {
			Ext.dispatch({
				controller: 'Ext.ux.mattgoldspink.subsonic.controllers.SongView',
				action    : 'loadFolder',
				historyUrl: 'songView/playlist/'+ id,
				id: id
			});
		}
    }
});
/*
 * #depends subsonic-application.js
 */
Ext.regController('Ext.ux.mattgoldspink.subsonic.controllers.User', {
        login: function(){
            Ext.regModel('Ext.ux.mattgoldspink.subsonic.model.User', {
                fields: ['u', 'p'],
                proxy: {
                    id: 'Ext.ux.mattgoldspink.subsonic.model.User',
                    type: 'localstorage'
                }
            });
            //our Store automatically picks up the LocalStorageProxy defined on the Search model
            this.store = new Ext.data.Store({
                model: "Ext.ux.mattgoldspink.subsonic.model.User"
            });

            //loads any existing Search data from localStorage
            this.store.load({
                scope   : this,
                callback: function(records){
                    if (records.length === 0) {
                        this.loginForm =this.makeLoginForm();
                        this.loginForm.show('pop');
                    } else {
                        Ext.apply(Ext.ux.mattgoldspink.subsonic.LoginDetails, records[0].data);
                        this.doAfterLogin();
                    }
                }
            });
        },
        doAfterLogin: function(){
            Ext.dispatch({
                controller: 'Ext.ux.mattgoldspink.subsonic.controllers.MusicStore',
                action: 'initialise'
            });
        },
        makeLoginForm: function(){
            return new Ext.Panel({
                floating: true,
                modal: true,
                centered: true,
                hideMaskOnTap: true,
                dockedItems: [
                    {
                        title: 'Login',
                        xtype: 'toolbar',
                        dock: 'top'   
                    }
                ],   
                items: [
                    {
                        xtype: 'form',
                        items: [
                            {
                                xtype: 'fieldset',
                                instructions: 'Please enter the information above.',
                                defaults: {
                                    // labelAlign: 'right'
                                    labelWidth: '35%'
                                },
                                items: [
                                    {
                                        xtype: 'textfield',
                                        name: 'u',
                                        label: 'Username',
                                        placeHolder: 'username',
                                        required: true,
                                        useClearIcon: true
                                    }, {
                                        xtype: 'passwordfield',
                                        name: 'p',
                                        label: 'Password',
                                        required: true,
                                        useClearIcon: true
                                    }
                                ]
                            },
                            {
                                xtype: 'fieldset',
                                items: [
                                    {
                                        xtype: 'button',
                                        text: 'Login',
                                        scope: this,
                                        handler: this.doLogin
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
        },
        doLogin: function(button){
            var form = button.ownerCt.ownerCt,
            values = form.getValues(),
            username = values.u,
            password = values.p;
            this.loginForm.hide('pop');
            Ext.Msg.show({
                   msg: 'Verifying your username and password',
                   width: 300
            });
            var params = {
                'u': username,
                'p': 'enc:'+Ext.ux.mattgoldspink.subsonic.hexEncode(password)
            };
            Ext.apply(params, Ext.ux.mattgoldspink.subsonic.LoginDetails);
            Ext.Ajax.request({
               url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/ping.view',
               scope: this,
               success: function(response) {
                   response = Ext.decode(response.responseText);
                    var status = response['subsonic-response'].status;
                    if (status === 'ok') {
                        this.store.add({u: params.u, p: params.p});
                        this.store.sync();
                        Ext.apply(Ext.ux.mattgoldspink.subsonic.LoginDetails, {u: params.u, p: params.p});
                        this.loginForm.destroy();
						Ext.dispatch({
							controller: 'Ext.ux.mattgoldspink.subsonic.controllers.MusicStore',
							action: 'initialise'
						});
                    } else {
                        Ext.Msg.hide();
                        Ext.Msg.setIcon(Ext.MessageBox.ERROR);
                        Ext.Msg.alert('Error', 'There was an error logging please check your credentials: <br/>' + response.responseText,
                        function(){
                            this.loginForm.show('pop');
                            form.reset(); 
                        });
                    }                            
               },
               failure: function(){
                    this.login();
               },
               params: params
           });
        }
    });
/*
 * #depends subsonic-application.js
 */
Ext.regController('Ext.ux.mattgoldspink.subsonic.controllers.SongView', {
	initLeftBar: function(options) {
		this.leftBarList = options.leftBar;
	},
    loadFolder: function(options) { 
        var id, type, store, idProp = 'id';
		if (Ext.isDefined(options.historyUrl)) {
			id = options.historyUrl.split('/')[2];
			type = options.historyUrl.split('/')[1];
		}
        store = this.getStore();
        if ((options.initComplete || this.initComplete) && Ext.isDefined(store)) {
            if (type === 'musicDirectory' || type === 'indexes') {
                store.setupMusicDirectoryCall();
            } else if (type === 'playlist') {
				store.setupPlaylistCall();
				if (!Ext.isDefined(this.task)) {
					this.task = new Ext.util.DelayedTask(this.setSelectedMenuItem(id), this);
				}
				this.task.delay(50);
			} else {
				store.setupIndexesCall();
				idProp = 'musicFolderId';
				if (!Ext.isDefined(this.task)) {
					this.task = new Ext.util.DelayedTask(this.setSelectedMenuItem(id), this);
				}
				this.task.delay(50);
			}
            store.getProxy().extraParams[idProp]=id;
            store.clearFilter();
            store.load();
            this.initComplete = true;
        }
    },
	setSelectedMenuItem: function(id) {
		return function(){
			var leftStore = this.getLeftBarStore(), rec = leftStore.getAt(leftStore.find('id', id));
			if (!Ext.isEmpty(rec)){
				this.leftBarList.getSelectionModel().select(rec);
				delete this.task;
			} else {
				this.task.delay(50);
			}
		};
	},
    getStore: function(){
        if(!Ext.isDefined(this.store)) {
            this.store = Ext.StoreMgr.get('Ext.ux.mattgoldspink.subsonic.stores.MusicStore');
        }
        return this.store;
    },
	getLeftBarStore: function(){
        if(!Ext.isDefined(this.leftBarStore)) {
            this.leftBarStore = Ext.StoreMgr.get('Ext.ux.mattgoldspink.subsonic.stores.LeftMenuStore');
        }
        return this.leftBarStore;
	}
});
/*global window: false*/
/*
 * #depends subsonic-application.js
 */
Ext.regController('Ext.ux.mattgoldspink.subsonic.controllers.Setup', {
    urls: ['', '/subsonic', '/music'],
    params: {},
    i: -1,
    detect: function() {
        if (!Ext.isDefined(Ext.ux.mattgoldspink.subsonic.apiUrl)) {
            Ext.apply(this.params, Ext.ux.mattgoldspink.subsonic.LoginDetails);
            this.makeRequest();
        } else {//end if
            Ext.dispatch({
                controller: 'Ext.ux.mattgoldspink.subsonic.controllers.User',
                action: 'login'
            });
        }
    },
    doSuccess: function(response){
        var node = Ext.decode(response.responseText);
        if (node) {
            Ext.Msg.hide();
            window.subtunes.userPrefsStore.setApiUrl(this.urls[this.i]);
            Ext.dispatch({
                controller: 'Ext.ux.mattgoldspink.subsonic.controllers.User',
                action: 'login'
            });
            Ext.dispatch({
                controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
                action: 'initialise'
            });
        } else {
            this.makeRequest();
        }
    },
    doFailure: function(response) {
           if (response.status === 404) {
               this.makeRequest();
           } else {
               this.doSuccess(response);
        }
    },
    makeRequest: function() {
        if (this.i === this.urls.length) {
            Ext.Msg.hide();
            Ext.Msg.prompt(
                'Subsonic url', 
                'Enter the url to subsonic:', function(btn, text){
                    if (btn == 'ok'){
                        this.urls.push(text);
                        Ext.Msg.hide();
                    }
                }
            ); // end Ext.Msg.prompt
        } else {
            var loc = window.location;
            Ext.Msg.show({
               msg: 'Attempting to auto discover subsonic api url...<br>Testing: ' + loc.protocol + '//' + loc.host + this.urls[++this.i],
               buttons: false
               });
            Ext.Ajax.request({
                   url: this.urls[this.i] + '/rest/ping.view',
                   params: this.params,
                   scope: this,
                   success: this.doSuccess,
                   failure: this.doFailure
            });// end Ext.Ajax.request
        }// end else
    }// end makeRequest()
});
/*global window: false, soundManager: false*/
/*
 * #depends subsonic-application.js
 */
Ext.regController('Ext.ux.mattgoldspink.subsonic.controllers.Player', {
    playListener: [],
    currentPlaylist: [],
    currentTrackId: undefined,
    volume: undefined,
	shuffle: false,
	repeatMode: 'off',
    setVolume: function(options){
        this.volume = options.value;
        if (Ext.isDefined(this.currentTrackId)) {
            soundManager.setVolume(this.currentTrackId, options.value);
        }
        Ext.each(this.currentPlaylist, function(track){
            track.setVolume(options.value);
        });
    },
    playTracks: function(options) {
        var tracks = options.tracks, startAtTrack = options.startAtTrack;
        this.disposeOfCurrent();
        tracks.each(function(track, index) {
            var id = track.get('id');
			var sound = {
				id: 'music' + id,
				url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/stream.view?' + Ext.urlEncode(Ext.ux.mattgoldspink.subsonic.LoginDetails) +'&id='+id,
				autoLoad: false,//(index === startAtTrack),
				autoPlay: false,
				trackdata: track.data,
				onload: this.handleOnLoad,
				onplay: this.handleOnPlay,
				onresume: this.handleOnPlay,
				onpause: this.handleOnPause,
				onfinish: this.handleOnFinish,
				onstop: this.handleOnStop,
				whileplaying: this.handleWhilePlaying,
				volume: this.volume
			};
            if (index === (startAtTrack + 1)){
                this.currentTrackId = 'music' + id;
				this.makeSound(sound).play();
            }
            this.currentPlaylist.push(sound);
        }, this);
    },
	makeSound: function(options) {
		return soundManager.createSound(options);
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
    skipInto: function(options) {
        soundManager.setPosition(this.currentTrackId, options.position * 1000);
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
            this.doOnFinish({
				track: current,
				skipping: true
			});
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
                            this.makeSound(nextTrack).play();
                            this.currentTrackId = nextTrack.id;
							return;
                        } else {
                            soundManager.setPosition(this.currentTrackId, 0);
                        }
                    }
                }
            }
        }
    },
    initialise: function() {
        if (soundManager.supported()) {
            soundManager.onplay = this.handleOnPlay;
            soundManager.onpause = this.handleOnPause;
            soundManager.onfinish = this.handleOnFinish;
        }
    },
    handleOnPlay: function(){
        Ext.dispatch({
            controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
            action    : 'doOnPlay',
            item: this
        });
    },
	handleOnLoad: function() {
		//this.play();
	},
    doOnPlay: function(options) {
        Ext.each(this.playListener, function(listener){
            listener.onPlay(options.item);
        });
    },
    handleOnPause: function() {
    
    },
	handleOnStop: function() {
        //window.Ext.ux.Bus.fireEvent('message', 'subsonic.track.stopped', this.options.trackdata);
    },
    doOnFinish: function(options){
		var nextTrack, doneTrack = options.track, skipping = options.skipping;
		if (!skipping && this.repeatMode === 'one') {
			nextTrack = doneTrack;
		} else if (!this.shuffle) {
			for (var i = 0; i < this.currentPlaylist.length; i++) {
				var track = this.currentPlaylist[i];
				if (track.id === doneTrack.sID && i+1 < this.currentPlaylist.length) {
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
					this.makeSound(nextTrack).play();
				}
			}
		} else {
			if (doneTrack.playState === 0) {
				this.handleOnStop.apply(doneTrack, []);
			} else {
				doneTrack.stop();
			}
			if (nextTrack) {
				var sound = this.makeSound(nextTrack);
				sound.load();
				sound.pause();
			}
		}
		if (nextTrack) {
			this.currentTrackId = nextTrack.id;
		} else {
			this.currentTrackId = this.currentPlaylist[0].id;
		}
    },
    handleOnFinish: function() {
        Ext.dispatch({
            controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
            action    : 'doOnFinish',
            track: this,
			skipping: false
        });
    },
    handleVolumeChange: function() {
        for (var i = 0; i < this.volume.length; i++) {
            try {
            
            } catch(e) {
                
            }
        }
    },
	doShuffleToggle: function(data) {
		this.shuffle = !this.shuffle;
	},
	handleRepeat: function(data) {
		this.repeatMode = data;
	},
    registerVolumeDisplay: function(options) {
        this.volume.push(options.volume);
    },
    registerPlayListener: function(options) {
        this.playListener.push(options.listener);
    }
});
/*global window: false*/
/*
 * #depends subsonic-application.js
 */
Ext.regController('Ext.ux.mattgoldspink.subsonic.controllers.MusicStore', {
    initialise: function(){
        this.store = Ext.StoreMgr.get('Ext.ux.mattgoldspink.subsonic.stores.MusicStore');
        var params = {};
        Ext.apply(params, Ext.ux.mattgoldspink.subsonic.LoginDetails);
        this.store.getProxy().extraParams = params;
		this.task = new Ext.util.DelayedTask(this.doDispatch, this);
		this.doDispatch();
    },
	doDispatch: function() {
		var url, model;
		url = window.location.hash.substring(1);
		if (Ext.isEmpty(url)) {
			model = Ext.StoreMgr.get('Ext.ux.mattgoldspink.subsonic.stores.LeftMenuStore').first();
			if (!Ext.isEmpty(model) && model.getId() && model.get('iconCls') === 'music') {
				url = '/musicFolder/' + model.getId();
			}
		}
		if (!Ext.isEmpty(url)) {
			Ext.dispatch({
				controller: 'Ext.ux.mattgoldspink.subsonic.controllers.SongView',
				action: 'loadFolder',
				initComplete: true,
				historyUrl: url
			});
			delete this.task;
		} else {
			this.task.delay(50);
		}
	}
});
/*
 * #depends subsonic-musicstore.js
 */
Ext.regModel('Ext.ux.mattgoldspink.subsonic.model.Music', {
    idProperty: 'id',
    fields: Ext.ux.mattgoldspink.subsonic.Fields
});

Ext.ux.mattgoldspink.subsonic.stores.MusicStore = Ext.extend(Ext.data.Store, {
   constructor: function(config) {
       var params = {};
       Ext.apply(params, Ext.ux.mattgoldspink.subsonic.LoginDetails);
       Ext.apply(config, {
            model: 'Ext.ux.mattgoldspink.subsonic.model.Music',
            id:'Ext.ux.mattgoldspink.subsonic.stores.MusicStore',
            sorters: 'name',
            getGroupString : function(record) {
				if (record.get('isDir')) {
					var name = record.get('name');
					if (name.length > 0) {
						return record.get('name')[0].toUpperCase();
					}
				}
				return '';
            },
            proxy: {
                type: 'ajax',
                url: Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getIndexes.view',
                extraParams: params,
                requestMethod: 'GET',
                reader: this.makeIndexesReader()
            }
        });
        Ext.ux.mattgoldspink.subsonic.stores.MusicStore.superclass.constructor.call(this, config);
        this.addAfterLoadListeners();
    },
    addAfterLoadListeners: function(){
        this.on('load', this.handleLoad, this);
    },
    handleLoad: function(store, records, successful) {
        Ext.Msg.hide();
        if (this.getProxy().url === Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getIndexes.view') {
            this.setupMusicDirectoryCall();
        }
    },
    loadNextData: function(id) {
        var rec = this.getById(id), typeOfRequest = rec.get('typeOfRequest'), idPropName = 'id';
        if (typeOfRequest === 'musicDirectory' || typeOfRequest === 'indexes') {
            this.setupMusicDirectoryCall();
        } else if (typeOfRequest === 'musicFolder') {
			this.setupIndexesCall();
			idPropName = 'musicFolderId';
		}
        if (rec.get('suffix') !== 'mp3') {
            this.getProxy().extraParams[idPropName]=id;
            this.clearFilter();
            this.load();
        }
    },
    setupIndexesCall: function(){
        this.getProxy().url = Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getIndexes.view';
        this.getProxy().setReader(this.makeIndexesReader());
    },
    setupMusicDirectoryCall: function(){
        this.getProxy().url = Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getMusicDirectory.view';
        this.getProxy().setReader(this.makeMusicDirectoryReader());
    },
	setupPlaylistCall: function(){
        this.getProxy().url = Ext.ux.mattgoldspink.subsonic.apiUrl + '/rest/getPlaylist.view';
        this.getProxy().setReader(this.makePlaylistReader());
    },
    makePlaylistReader: function() {
        if (!Ext.isDefined(this.playlistReader)) {
            this.playlistReader = new Ext.data.JsonReader({
                root: 'playlist.entry',
                getData: function(data){
                    var recs;
                    data = data['subsonic-response'];
                    recs = data.playlist.entry;
                    if (!Ext.isArray(recs)) {
                        data.playlist.entry = [recs];
                    }
                    Ext.each(recs, function(rec){
                        rec.typeOfRequest = 'playlist';
						rec.name = rec.title;
                    });
                    return data;
                }
            });
        }
        return this.playlistReader;
    },
    makeMusicDirectoryReader: function() {
        if (!Ext.isDefined(this.musicDirectoryReader)) {
            this.musicDirectoryReader = new Ext.data.JsonReader({
                root: 'directory.child',
                getData: function(data){
                    var recs;
                    data = data['subsonic-response'];
                    recs = data.directory.child;
                    if (!Ext.isArray(recs)) {
                        data.directory.child = [recs];
                    }
                    Ext.each(recs, function(rec){
                        if (!rec.name) {
                            rec.name = rec.title;
                            delete rec.title;
                        }
                        rec.typeOfRequest = 'musicDirectory';
                    });
                    return data;
                }
            });
        }
        return this.musicDirectoryReader;
    },
    makeIndexesReader: function() {
        if (!Ext.isDefined(this.indexesReader)) {
            this.indexesReader = new Ext.data.JsonReader({
                root: 'indexes.index',
                getData: function(data){
                    var recs;
                    data = data['subsonic-response'];
                    recs = data.indexes.index;
                    data.indexes.index = [];
                    if (!Ext.isArray(recs)) {
                        recs = [recs];
                    }
                    Ext.each(recs, function(index){
                        Ext.each(index.artist, function(artist) {
                            artist.typeOfRequest = 'indexes';
                            artist.isDir = true;
                            data.indexes.index.push(artist);
                        });
                    });
                    return data;
                }
            });
        }
        return this.indexesReader;
    }
}); 
/*
 * #depends subsonic-store.js
 */
Ext.ux.mattgoldspink.VolumeSlider = Ext.extend(Ext.form.Slider, {
    constructor: function() {
        Ext.apply(this, {
            value: 100,
            minValue: 0,
            maxValue: 100,
            cls: 'volumeslider',
            height: 40,
            listeners: {
                change: function(slider, thumb, newValue, oldValue){
                    Ext.dispatch({
                        controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
                        action: 'setVolume',
                        volume: newValue
                    });
                }
            }
        });
        Ext.ux.mattgoldspink.VolumeSlider.superclass.constructor.call(this);
   }
});

Ext.ux.mattgoldspink.TrackPositionSlider = Ext.extend(Ext.form.Slider, {
    constructor: function() {
        Ext.apply(this, {
            value: 0,
            minValue: 0,
            maxValue: 100,
            cls: 'trackpositionslider',
            draggable: false
        });
        Ext.ux.mattgoldspink.TrackPositionSlider.superclass.constructor.call(this);
   }
});


Ext.ux.mattgoldspink.ControlButtonPanel = Ext.extend(Ext.Panel, {
    constructor: function() {
        Ext.apply(this, {
            html:  '<div class="backbutton button"></div><div id="mainplay" class="playstatebutton button"></div><div class="forwardbutton button"></div>',
            height: 50,
            cls: 'controlbuttons',
            listeners: {
                afterrender: this.registerListeners,
				body: {
					tap: this.handleTap,
					delegate: '.button',
					scope: this
				}
            }
        });
        Ext.ux.mattgoldspink.ControlButtonPanel.superclass.constructor.call(this);
   },
   handleTap: function(evt, el, options){
        el = Ext.get(el);
		if (el.hasCls('playstatebutton')) {
			this.handlePlayTap(evt, el, options);
		} else if (el.hasCls('backbutton')) {
			this.handleBackButtonTap(evt, el, options);
		} else if (el.hasCls('forwardbutton')){
			this.handleForwardButtonTap(evt, el, options);
		}
   },
   handlePlayTap: function(evt, el, options){
		if ( el.hasCls('play')) {
			Ext.dispatch({
				controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
				action: 'pauseCurrent'
			});
			 el.removeCls('play');
		} else {
			Ext.dispatch({
				controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
				action: 'resumeCurrent'
			});
		    el.addCls('play');
		}
	},
	handleBackButtonTap: function(evt, el, options){
		Ext.dispatch({
			controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
			action: 'skipBackward'
		});
	},
	handleForwardButtonTap: function(evt, el, options){
		Ext.dispatch({
			controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
			action: 'skipCurrent'
		});
	},
	registerListeners: function() {
		this.playbutton = Ext.get(Ext.get(this.el).query('.playstatebutton')[0]);
		Ext.dispatch({
			controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
			action: 'registerPlayListener',
			listener: this
		});
   },
   onPlay: function(item) {
        this.playbutton.addCls('play');
   }
});

Ext.ux.mattgoldspink.SearchField = Ext.extend(Ext.form.FormPanel, {
    constructor: function() {
        Ext.apply(this, {
            cls: 'x-toolbar',
            items: [
                {
                    xtype: 'searchfield',
                    placeHolder: 'Search',
                    height: 40
                }
            ]
        });
        Ext.ux.mattgoldspink.SearchField.superclass.constructor.call(this);
   }
});

Ext.ux.mattgoldspink.PlayerBarCenter = Ext.extend(Ext.Panel, {
    buttonPanel:  new Ext.ux.mattgoldspink.ControlButtonPanel(),
    trackPositionSlider: new Ext.ux.mattgoldspink.TrackPositionSlider(),
    constructor: function(){
        Ext.apply(this, {
            items: [
               this.buttonPanel,
               this.trackPositionSlider
            ]
        });
        Ext.ux.mattgoldspink.PlayerBarCenter.superclass.constructor.call(this);
    }
});

Ext.ux.mattgoldspink.PlayerBar = Ext.extend(Ext.Panel, {
    volumeSlider: new Ext.ux.mattgoldspink.VolumeSlider(),
    playerBarCenter: new Ext.ux.mattgoldspink.PlayerBarCenter(),
    searchField: new Ext.ux.mattgoldspink.SearchField(),
    constructor: function(){
        
        Ext.apply(this, {
            cls: 'playerbar',
            layout: {
                type: 'hbox',
                align:  'center'
            },
            dock: 'top',
            defaults: {
                flex: 1 
            },
            items: [
                this.volumeSlider, 
                this.playerBarCenter,
                this.searchField
            ],
            height: 72
        });
        Ext.ux.mattgoldspink.PlayerBar.superclass.constructor.call(this);
        this.registerListeners();
    },
    registerListeners: function(){
        this.on('afterlayout', this.updateSliderProportions, this);
    },
    updateSliderProportions: function(){
        this.volumeSlider.onOrientationChange();
        this.playerBarCenter.buttonPanel.onOrientationChange();
    }
});
/*
 * #depends subsonic-store.js
 */
Ext.ux.mattgoldspink.ArtistViewPanel = Ext.extend(Ext.Panel, {
    constructor: function(){
        Ext.apply(this, {
            items: [{
                xtype: 'list',
                fit: true,
                listeners: {
                    itemTap: this.handleItemTap
                },
                itemTpl: this.getSongViewTpl(),
                grouped: false,
                store: Ext.StoreMgr.get('Ext.ux.mattgoldspink.subsonic.stores.MusicStore'),
                itemSelector: '.row'
            }],
            cls: 'grid artist',
            fit: true,
            layout: 'fit'
        });
        Ext.ux.mattgoldspink.ArtistViewPanel.superclass.constructor.call(this);
    },
    getSongViewTpl: function(){
        return new Ext.XTemplate(
            '<div id="{id}" class="row">',
                '<img src="{[Ext.ux.mattgoldspink.subsonic.apiUrl]}/rest/getCoverArt.view?size=50&id={coverArt}&{[Ext.urlEncode(Ext.ux.mattgoldspink.subsonic.LoginDetails)]}" />',
                '<tpl if="isDir">',
                    '<div class="dir"><strong>{name}</strong></div>',
                '</tpl>',
                '<tpl if="isDir === false || isDir === undefined">',
                    '<div class="cell title"><strong>{[Ext.util.Format.ellipsis(values.name, 22)]}</strong></div>',
                    '<div class="cell">{[Ext.util.Format.ellipsis(values.artist, 22)]}</div>',
                    '<div class="cell">{[Ext.util.Format.ellipsis(values.album, 22)]}</div>',
                    '<div class="cell duration">{[this.renderDuration(values.duration)]}</div>',
                '</tpl>',
            '</div>',{
            renderDuration: function(duration) {
                var secs = (duration % 60).toString();
                while (secs.length < 2) {
                    secs = 0 + '' + secs;
                }
                return Math.floor(duration / 60) + ':' + secs;
            }    
        });
    },
    handleItemTap: function(dataView, index, item, evt){
        Ext.dispatch({
            controller: 'Ext.ux.mattgoldspink.subsonic.controllers.SongView',
            action    : 'loadFolder',
            historyUrl: 'artistView/'+item.id,
            id: item.id
        });
    }
});
/*
 * #depends subsonic-store.js
 */
Ext.ux.mattgoldspink.AjaxGridPanel = Ext.extend(Ext.Panel, {
    constructor: function(){
        Ext.apply(this, {
            items: [{
                xtype: 'list',
                fit: true,
                listeners: {
                    itemTap: this.handleItemTap
                },
                itemTpl: this.getSongViewTpl(),
                grouped: true,
                store: new Ext.ux.mattgoldspink.subsonic.stores.MusicStore({}),
                indexBar: true,
                itemSelector: '.row'
            }],
            cls: 'grid',
            fit: true,
            layout: 'fit'
        });
        Ext.ux.mattgoldspink.AjaxGridPanel.superclass.constructor.call(this);
		this.list = this.items.items[0];
		this.list.store.on('datachanged', this.resetScroll, this);
    },
	resetScroll: function(){
		this.list.scroller.scrollTo({
			x: 0,
			y: 0
		});
	},
    getSongViewTpl: function(){
        return new Ext.XTemplate(
            '<div id="{id}" class="row {[values.isDir? "dir" : "track"]}">',
                '<tpl if="isDir">',
                    '<div class="{typeOfRequest}"><strong>{name}</strong></div>',
                '</tpl>',
                '<tpl if="isDir === false || isDir === undefined">',
                    '<div class="cell title"><strong>{[Ext.util.Format.ellipsis(values.name, 22)]}</strong></div>',
                    '<div class="cell">{[Ext.util.Format.ellipsis(values.artist, 20)]}</div>',
                    '<div class="cell">{[Ext.util.Format.ellipsis(values.album, 20)]}</div>',
                    '<div class="cell duration">{[this.renderDuration(values.duration)]}</div>',
                '</tpl>',
            '</div>',{
            renderDuration: function(duration) {
                var secs = (duration % 60).toString();
                while (secs.length < 2) {
                    secs = 0 + '' + secs;
                }
                return Math.floor(duration / 60) + ':' + secs;
            }    
        });
    },
    handleItemTap: function(dataView, index, item, evt){
		if (Ext.get(item).hasCls('dir')) {
			Ext.dispatch({
				controller: 'Ext.ux.mattgoldspink.subsonic.controllers.SongView',
				action    : 'loadFolder',
				historyUrl: 'songView/' + Ext.get(item).first('div', true).className.trim() + '/' + item.id,
				id: item.id
			});
		} else {
			Ext.dispatch({
				controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Player',
				action: 'playTracks',
				tracks: Ext.StoreMgr.get('Ext.ux.mattgoldspink.subsonic.stores.MusicStore').data,
				startAtTrack: index
			});
		}
    }
}); /*
 * #depends subsonic-artistViewPanel.js
 * #depends subsonic-AjaxGridPanel.js
 */
Ext.ux.mattgoldspink.MusicViewCardPanel = Ext.extend(Ext.Panel, {
    constructor: function(){
        Ext.apply(this, {
            layout: 'card',
            id: 'Ext.ux.mattgoldspink.MusicViewCardPanel',
            fit: true,
            items: [new Ext.ux.mattgoldspink.AjaxGridPanel(), new Ext.ux.mattgoldspink.ArtistViewPanel({})]
        });
        Ext.ux.mattgoldspink.MusicViewCardPanel.superclass.constructor.call(this);
    }
});
/*
 * #depends subsonic-musicviewcardpanel.js
 * #depends subsonic-leftbar.js
 */
Ext.ux.mattgoldspink.CenterPanel = Ext.extend(Ext.Panel, {
    constructor: function() {
        Ext.apply(this, {
            dockedItems: [new Ext.ux.mattgoldspink.LeftMenuPanel()],
            items:  new Ext.ux.mattgoldspink.MusicViewCardPanel(),
            fit: true,
            layout: 'fit'
        });
        Ext.ux.mattgoldspink.CenterPanel.superclass.constructor.call(this);
    }
});
/*
 * #depends subsonic-musicviewcardpanel.js
 */
Ext.ux.mattgoldspink.BottomBar = Ext.extend(Ext.Toolbar, {
    constructor: function(config){
        Ext.apply(this, config, {
            ui: 'light',
            dock: 'bottom',
            cls: 'bottom-bar',
            layout: {
                pack: 'center'
            },
            items: this.makeButtonGroup()
         });
         Ext.ux.mattgoldspink.BottomBar.superclass.constructor.call(this, config);
    },
    makeButtonGroup: function(){
        this.buttonGroup = [
            {
                xtype: 'segmentedbutton',
                allowDepress: true,
                items: [
                    {
                        text: 'Songs',
                        handler: this.handleSongsClick,
                        pressed: true
                    }, {
                        text: 'Artists',
                        handler: this.handleArtistsClick
                    }, {
                        text: 'Albums',
                        handler: this.handleAlbumsClick
                    }
                ]
            }
        ];
        return this.buttonGroup;
    },
    handleSongsClick: function(){
        Ext.getCmp('Ext.ux.mattgoldspink.MusicViewCardPanel').setActiveItem(0);
    },
    handleArtistsClick: function(){
        Ext.getCmp('Ext.ux.mattgoldspink.MusicViewCardPanel').setActiveItem(1);
    },
    handleAlbumsClick: function(){
        Ext.getCmp('Ext.ux.mattgoldspink.MusicViewCardPanel').setActiveItem(2);
    }    
});
/*
 * #depends subsonic-centerpanel.js
 * #depends subsonic-bottombar.js
 * #depends subsonic-playerbar.js
 */
Ext.setup({
    tabletStartupScreen: 'tablet_startup.png',
    phoneStartupScreen: 'phone_startup.png',
    icon: 'icon.png',
    glossOnIcon: false,
    onReady: function() {    
        var panel = new Ext.Panel({
            fullscreen: true,
            layout: 'fit',
            dockedItems: [
                new Ext.ux.mattgoldspink.PlayerBar(), 
                new Ext.ux.mattgoldspink.BottomBar()
                ],
             items: [
                new Ext.ux.mattgoldspink.CenterPanel()
             ],
             listeners: {
                afterrender: function(){
                    Ext.dispatch({
                        controller: 'Ext.ux.mattgoldspink.subsonic.controllers.Setup',
                        action    : 'detect'
                    });
                } // end afterrender
            }// end listeners
        });


    }
});
