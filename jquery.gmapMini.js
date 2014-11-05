/*

Yale School of Medicine
Gmap Mini
by Jon Krauss, jonkrauss.com


This is a description.


_How to instantiate:

	$(".selector").gmapMini();

...where

_Sample HTML



*/


(function($) {
$.extend({
	
	gmapMini: new	function() {
		
		var caption_visible = false;
		this.defaults = {
			lat_class:'map-lat',
			long_class:'map-long',
			zoom:15
		};
		
		function benchmark(s, d) {
			log(s + "," + (new Date().getTime() - d.getTime()) + "ms");
		}
		this.benchmark = benchmark;
		
		function log(s) {
			if (typeof console != "undefined" && typeof console.debug != "undefined") {
				console.log(s);
			} else {
				//alert(s);
			}
		}
		
		this.construct = function(options) {
			return this.each(function() {
			 
				var	$this = $(this), $document, settings = {}, 
					opts, latlng, lat, lng,
					MapList = new Array(),
					geocoder ,//= new google.maps.Geocoder(),
					GetLatLong = function (address) {};

				settings = $.extend(this.settings, $.gmapMini.defaults, options);
				
				this.geocoder = new google.maps.Geocoder();
				
				//get params
				lat = $this.find('.'+settings.lat_class,$this).text();
				lng = $this.find('.'+settings.long_class,$this).text();
				
				var arrAddr = document.getElementsByTagName('address');
				var strAddr = arrAddr[arrAddr.length-1].innerHTML;
					arrAddr = strAddr.toLowerCase().split('</strong>');
					strAddr = arrAddr[arrAddr.length-1].toString().replace(/\s+/g,'+').replace(/<[br^>]*?>/g, '+').replace(/&nbsp;/g,",+");
				
				while(strAddr.charAt(0)=='+'){
				 	strAddr = strAddr.substring(1,strAddr.length)
				}
		
							
				latlng =  new google.maps.LatLng(lat, lng),
				opts = {
					zoom: settings.zoom,
					center: latlng,
					disableDefaultUI: true,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				};				
				
				

				$.data(this, "gmapMini", settings);
				
				//drawMap(this, opts);
				
				//create map
				var map = new google.maps.Map( this, opts );
	
				//create marker
				var marker = new google.maps.Marker({
					position: opts.center,
					title:""
				});
				marker.setMap(map);
				

				var image = new google.maps.MarkerImage(
					'images/icon_marker_single.gif',
					new google.maps.Size(28,35),
					//new google.maps.Point(0,0),
					new google.maps.Point(0,0)
				);
				
				
				marker = new google.maps.Marker({
					icon: image,
					map: map,
					position: opts.center
				});				
				marker.setMap(map);
				
				//create forcefield
				$this.append( $('<a href="http://maps.google.com/maps?q='+ strAddr+ '&hl=en&ll=' + lat + ',' + lng +'" target="_blank" class="map-forcefield"></a>') );

			});

		};		
	}
});

$.fn.extend({
	gmapMini: $.gmapMini.construct
});

})(jQuery);