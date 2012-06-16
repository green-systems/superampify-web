<?php 
  session_start();
  if (!isset($_SESSION['handshake'])): ?>
  Session not set!<?php die; ?>
<?php endif; ?>

<!DOCTYPE html> 
<html xmlns="http://www.w3.org/1999/xhtml"> 
	<head> 
		<title>SubTunes - Music Player</title>
		<meta name="apple-mobile-web-app-capable" content="yes">
		<script src="persist-js-0.1.0/persist.js" type="text/javascript"></script>
		<script>
            var handshake = "<?php echo $_SESSION['handshake']; ?>";
            var mode = "debug";
            var extjsVersion = "3.3.1", soundmanagerVersion = "v297a-20110123", senchaTouchVersion = "1.0.1";
            (function(){            
                  var os, desktopCss, desktopJs, detect;
                  window.subtunes = {
                      writeCssToDoc : function(css){
                            for (i = 0; i < css.length; i++) {
                                document.writeln('<li'+'nk rel="stylesheet" type="text/css" href="'+ (css[i].match(/http:/)? '' : window.subtunes.rootUrl) + css[i]+'" />');
                            }
                      },
                      writeJsToDoc : function(js) {
                            for (i = 0; i < js.length; i++) {
                                document.writeln('<scr'+'ipt src="' + (js[i].match(/http:/)? '' : window.subtunes.rootUrl) + js[i] + '" type="text/javascript"></scr'+'ipt>'); 	
                            }
	                },
                    //rootUrl: 'http://subtunes.googlecode.com/svn/trunk/'
                    rootUrl: ''
                  };
                  detect = function(ua){
                    var ua = ua, os = {},
                      ipad = ua.match(/(iPad).*OS\s([0-9_]+)/);
                    if(ipad) os.ios = true, os.version = ipad[2].replace(/_/g,'.'), os.ipad = true;
                    return os;
                  }
                  os = detect(navigator.userAgent);
    		      if (os.ipad) {
        		        css = ['touch/css/application.css'];
           		        js = ['sencha-touch-'+senchaTouchVersion+'/sencha-touch-debug.js', 'soundmanager2/soundmanager'+soundmanagerVersion+'/script/soundmanager2-jsmin.js'];
        		        window.subtunes.mode = 'touch';
    		      } else {
        		        css = ['ext-'+extjsVersion+'/resources/css/ext-all-notheme.css', 'ext-'+extjsVersion+'/resources/css/xtheme-gray.css', 'ext-'+extjsVersion+'/examples/ux/statusbar/css/statusbar.css', 'desktop/css/application.css', 'coverflow/imageflow.packed.css'];
           		        js = ['jquery/jquery.min.js', 'ext-'+extjsVersion+'/adapter/jquery/ext-jquery-adapter.js', 'ext-'+extjsVersion+'/ext-all.js', 'ext-'+extjsVersion+'/examples/ux/BufferView.js','ext-'+extjsVersion+'/examples/ux/statusbar/StatusBar.js', 'coverflow/imageflow.js', 'hive/jquery.hive.js', 'soundmanager2/soundmanager'+soundmanagerVersion+'/script/soundmanager2-jsmin.js',  'Ext.ux.MsgBus.js'];
        		        window.subtunes.mode = 'desktop';
    		      }
    		      window.subtunes.writeCssToDoc(css);
    		      window.subtunes.writeJsToDoc(js);
            })();
		</script>
		<script src="common/data/user-prefs-store.js" type="text/javascript"></script>
		<script>
			window.subtunes.userPrefsStore.initSoundManager();
            soundManager.url    =    'soundmanager2/soundmanager'+soundmanagerVersion+'/swf/';
		</script>
	</head> 
	<body>
	    <div id="sm2-container"></div>
			<script>
		    Ext.namespace('Ext.ux.mattgoldspink.subsonic');
	    	Ext.ux.mattgoldspink.subsonic.subTunesVersion = '0.9.4';
	    	Ext.ux.mattgoldspink.subsonic.desktopApp = false;
	    	if(typeof chrome !== 'undefined'){
        		if(typeof chrome.extension !== 'undefined')
        		Ext.ux.mattgoldspink.subsonic.desktopApp = true;
        	}
            Ext.ux.mattgoldspink.subsonic.LoginDetails = {
                    c: 'subsonicext',
                    v: '1.4.0',
                    f: 'json',
                    u: 'false',
                    p: 'false',
                    handshake: handshake
            };
			window.subtunes.userPrefsStore.initExt();
            document.writeln('<scr'+'ipt src="' + window.subtunes.rootUrl + window.subtunes.mode + '/subsonic-autodetect.js" type="text/javascript"></scr'+'ipt>');
        </script> 
	</body> 
</html>

