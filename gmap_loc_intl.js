
(function($) {

	//declare and set some variables
	var settings;
	var map;
	var infobox;
	var el;
	var $el;
	var locations;
	var og_locations;

	var marker_icons = new Array();
	var marker_icons_hot = new Array();
	var all_markers = new Array();
	var icons = [];
	var location_markers = new Array();
	var active_location_markers = new Array();

	var current_index = 0;
	var active_marker = 0;
	var active_menu_page = 0;
	var total_menu_pages;

	var locations_loaded = false;
	var menu_below = false;
	var lat_lng;
	var xml_path;
	var zoomListener;
	var filter = "";


	//constructor
	$.gmap_intl = function(element, locations_xml, options) {
		//try { console.log('!gmap_intl '+settings.org_id); } catch(e){}
		settings = {};
		$(element).data('gmap_intl', this);
		settings = $.extend({}, $.gmap_intl.defaultOptions, options); 	
		el = this;
		$el = $(element);
		//public methods
			
		this.addFilter = function(terms){
		//apply filter
		var nodes = $(og_locations).find("location")
			.filter( function(i){
				var selection = $(this).find(":not(latitude, longitude, buildingType, buildingCode, locationType):icontains('"+terms+"')")
				if ( selection.length > 0 ){ return this; }
			});
		var total = nodes.length;
				
		if (total < 1){ return false; }
		filter = terms;
				
		//try{ console.log('addFilter "'+terms+'", '+total); } catch (e){}
				
		allDataLoaded();
		return total;
	};
	this.clearFilter = function(){

		//try{ console.log('clearFilter'); } catch (e){}
		filter = "";
		allDataLoaded();
	};
		
		
	this.getCurrentIndex = function(){
	//try { console.log('gmap getCurrentIndex '+current_index ); } catch(e){}	
		return current_index;
	};
		
	this.getLocationsData = function(){
		//try { console.log('gmap_intl getLocationsData '+$(og_locations).find("location").length+' '+$(locations).find("location").length ); } catch(e){}
		return og_locations;	
	}
		
	this.setLocationsData = function(new_locations){
		//try { console.log('gmap setLocationsData '+$(og_locations).find('location').length+' '+$(new_locations).find('location').length ); } catch(e){}
		locations = new_locations;
		allDataLoaded();		
	}
		
	this.selectLocationByIndex = function(index){
	//function for external links to simulate marker click			
		markerClickHandler(location_markers[index]);
	};
	
	this.infoboxAddedHandler = function(){
		infoboxAdded();
	};
		
	init(element, settings);
};
	
//return instance
$.fn.gmap_intl = function(settings) {    
	return this.each(function(i) {			 
		(new $.gmap_intl( $(this), settings) );              
	});    
};

	//default options
	$.gmap_intl.defaultOptions = {
		class_name:'gmap_intl',
		images_directory: '/files/images/',
		icon_height:35,
		icon_width:28,
		org_id:'org-id',
		mode:'none',
		mode_id:'mode',
		display_menu: true,
		display_menu_id: 'display-menu',
		show_first_infobox: true,
		show_first_infobox_id: 'show-first-infobox',
		short_menu_text: false,
		short_menu_text_id: 'short-menu-text',
		visible_menu_items: 6,
		visible_menu_items_id: 'visible-menu-items',
		initial_zoom: 2,
		initial_lat: 30,
		initial_long: 30,
		map_canvas_id: 'map-canvas',
		locations_menu_id: 'map-sidebar',
		locations_menu_controls_id: 'location-controls',
		menu_below_class: 'menu-below',
		close_button_id: 'button-close-infowindow',
		total_numbered_icons: 20,
		directions_link: null,
		use_google_directions: false,
		use_google_directions_id: 'use-google-directions',
		last_icon: [],
		auto_zoom_to_fit: false,
		json: (($('#map-data').length) ? $.parseJSON(document.getElementById('map-data').innerHTML):{})
	};


	//private methods
	function init(element, settings){  
		getParams();		
		buildMap();
		loadLocationsXML();
	};
	
	function log(s){
		if (typeof console != "undefined" && typeof console.debug != "undefined") {
			console.log(s);
		} else {
			//alert(s);
		}
	};
	
	function getParams(){
		
		
		if ($('#'+settings.mode_id).length > 0){
			settings.mode = $('#'+settings.mode_id).text();
			//try { console.log('gmap mode '+settings.mode); } catch(e){}
		}

		if ( $('#menu-below').html() == "true"){
			menu_below = true;
			$el.css('height','auto');
			$('#'+settings.map_canvas_id).css('float','none');
			$('#'+settings.locations_menu_id).addClass(settings.menu_below_class);
		} else {
			menu_below = false;
		}
		

		if ($('#'+settings.use_google_directions_id).length > 0){
			settings.use_google_directions = ( $('#'+settings.use_google_directions_id).text() === 'true');
		}
		if ($('#'+settings.display_menu_id).length > 0){
			settings.display_menu = ( $('#'+settings.display_menu_id).text() === 'true');
		}
		if ($('#'+settings.show_first_infobox_id).length > 0){
			settings.show_first_infobox = ( $('#'+settings.show_first_infobox_id).text() === 'true');
		}
		if ($('#'+settings.short_menu_text_id).length > 0){
			settings.short_menu_text = ( $('#'+settings.short_menu_text_id).text() === 'true');
		}
		
		if ($('#'+settings.visible_menu_items_id).length > 0){
			settings.visible_menu_items = parseInt( $('#'+settings.visible_menu_items_id).text() );
		}


		if ($('#'+settings.org_id).text() == " " || $('#'+settings.org_id).text() == "  "){
			$('#'+settings.org_id).text('');
		}


		//try{ console.log(settings.use_google_directions+' '+ settings.display_menu+' '+settings.show_first_infobox+' '+settings.short_menu_text+' '+settings.visible_menu_items); }catch(e){}
	};
	
	function buildMap(){

		//log('buildMap '+settings.initial_zoom);

		lat_lng = new google.maps.LatLng( settings.initial_lat, settings.initial_long );
		
		//initial settings object
		var init_obj = {
			zoom: settings.initial_zoom,
			center: lat_lng,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			mapTypeControl: false,
			disableDefaultUI: true,
			scrollwheel: false
		};
		
		//create map
		map = new google.maps.Map(document.getElementById(settings.map_canvas_id), init_obj);
		
		if  (!!settings.json.cities) {
			var back_link = document.createElement('div');
			back_link.className = 'map-back-link';
			var link_command="javascript:window.location=[location.protocol, '//', location.host, location.pathname].join('')";
			back_link.innerHTML = '<div><A HREF="'+link_command+'"><img src="/files/images/map_arrow_rt.gif" alt="Return to World Map"/>Return to World Map</a></div>'
			map.controls[google.maps.ControlPosition.TOP_RIGHT].push(back_link);
		}
		
	};
		
	function loadLocationsXML(){
		createLocationMarkers();
		var new_width = $('#'+el['selector']).width();
		$('#'+settings.locations_menu_id).hide();
		$('#'+settings.map_canvas_id).css('width',new_width - 2);		
	};
	
	function infoboxAdded(){
	
		//add close button event
		$("a#button-close-infowindow").click(function(e){
			e.preventDefault();
			infobox.remove();
			return false;
		});
		
		
		if (settings.use_google_directions){
			
			$("a#button-directions").click(function(e){
			
				//$("#overlay-footer").hide();
				//$("#directions").show();
				$("#overlay-footer").css('display','none');
				$("#directions").css('display','block');
				
				$("#input-directions").focus();
				
				return false;
			});
			
			//add submit directions button event
			$("a#button-directions-submit").click(function(e){
				e.preventDefault();
				directionsSubmitHandler();
				return false;
			});
			
			$('#input-directions').keypress( function(e) {
				if (e.keyCode == '13') {
					e.preventDefault();
					directionsSubmitHandler();
					return false;
				}
			});
		}
	};
	
	function directionsSubmitHandler(){
		
		//get start address value from form text input
		if (document.getElementById("input-directions").value.length > 0){
			var input_value = $("#input-directions").val();
		} else {
			return false;
		}
		
		//convert spaces to pluses
		var start_address = $("#input-directions").val().replace(/\s/g,"+");

		var end_location = location_markers[active_marker].directions_address;
		//end_location = end_location.replace(/\s/g,"+");
		
		//redirect to google page with directions
		directions_url = "http://maps.google.com/maps?saddr="+start_address+"&daddr="+end_location;
		window.open(directions_url,'directions');

		return false;
	};
	
	function buildLocationsMenu(){
		
		//hide location menu
		$("#"+settings.locations_menu_id).hide();
		$("#"+settings.locations_menu_id+' div.item').remove();


		var i = 0;
		
		//apply filter
		var nodes = $(og_locations).find("location").filter( function(i){
			var selection = $(this).find(":not(latitude, longitude, buildingType, buildingCode, locationType):icontains('"+filter+"')");
			if ( selection.length > 0 ){ return this; }
		});
		
//try { console.log( '!!!!! buildLocationsMenu   '+ $(nodes).length ); } catch(e) {}
		
		$(nodes).each( function(j){
			
			var $node = $(this);
			
			//build menu items
			
								    
			//add html for individual menu items
			var address = getAddressHtml( $node );

			var item_title;
			if ($node.find("locationName").text()){
				item_title = $node.find("locationName").text();
//try{ console.log('locationName'); } catch(e) {}
			} else {
				item_title = $node.find("buildingName").text();
//try{ console.log('buildingName'); } catch(e) {}
			}
	
			//item footer text
			var item_footer;
			var has_hours = false;
			var has_phone = false;
			
			if ($node.find("hours").length > 0){
				has_hours = true;
			}
			if ($node.find("infoPhone").length > 0 || $node.find("faxPhone").length > 0){
				has_phone = true;
			}
			
			if (has_hours && has_phone){
				item_footer = "Show Hours/Phone";
			}
			if (has_hours && !has_phone){
				item_footer = "Show Hours";
			}
			if (!has_hours && has_phone){
				item_footer = "Show Phone";
			}
			if (!has_hours && !has_phone){
				item_footer = "Show More";
			}
			
			if (!menu_below){
			
				var item_class = (i < 99) ? 'item-number' : 'item-number-wide';
			
				var str_menu_html = "<div class='item' title='"+(i+1)+"'>"+
					"<div class='"+ item_class +"'>"+(i+1)+"</div>"+
						"<h3>"+item_title+"</h3>"+
						"<p>"+address+"</p>"+
						"<div class='item-footer'>"+
							"<p><a>"+item_footer+"</a></p>"+//Show Hours/Phone
						"</div>"+
					"</div>";
				
			} else {
				
				var fax = $node.find("faxPhone").text();
				var info = $node.find("infoPhone").text();
				var appt = $node.find("appointmentPhone").text();
				var end_location = getAddress($node);
				end_location = end_location.replace(/\s/g,"+");
				var directions = "http://maps.google.com/maps?saddr=&daddr="+end_location;
				

				var str_menu_html = '<div class="item" title="'+(i+1)+'">'+
					'<div class="floatlt space-right">'+
						'<img src="'+settings.images_directory+'/icon_marker_'+(i+1)+'.gif" alt="'+(i+1)+'" />'+
					'</div>'+
					'<div class="wrapper">'+
						'<p class="floatrt"><a href="'+directions+'" class="button-directions">Directions...</a></p>'+
						'<h3>'+item_title+'</h3>'+
						'<p class="no-space gray95">'+address+'</p>';
						if (appt || info){
							str_menu_html += '<dl class="tight title-50 half">';
							if (appt){
								str_menu_html += '<dt class="orange">Appt</dt><dd>'+appt+'</dd>';
							}
							if (info){
								str_menu_html += '<dt class="orange">Info</dt><dd>'+info+'</dd>';
							}
							str_menu_html += '</dl>';
						}
						
						if (fax){
							str_menu_html += '<dl class="tight title-50 half">'+
							'<dt class="orange">Fax</dt><dd>'+fax+'</dd>'+
							'</dl>';
						}
					str_menu_html += '</div></div>';

			}
			
			//add item html to page
			$("#"+settings.locations_menu_id).append(str_menu_html);
			
			i++;
		});
		
		if (settings.short_menu_text){
			$('.location-city-st-zip').hide();
		} else {
			$('.location-city-st-zip').show();
		}		
		
		//add click events to menu items
		$("#"+settings.locations_menu_id+" div.item").click(function(e, i){
			
			e.preventDefault();
			
			var index = $(this).attr("title") - 1;
			selectLocation(index);
			
			if (menu_below){
				var y = $("#"+settings.map_canvas_id).offset().top - 35;//35px space above map
  				$('html,body').animate({scrollTop: y}, 1000);	
			}

			return false;
		});
		
		if (menu_below){

			//add menu directions button events
			$("a.button-directions").click(function(e){
				
				var index = $(this).parent().parent().parent().attr('title');
				index = parseInt(index-1);
							
				//convert spaces to pluses
				var start_address = "";

				var end_location = location_markers[index].directions_address;
				//end_location = end_location.replace(/\s/g,"+");
	
				//redirect to google page with directions
				directions_url = "http://maps.google.com/maps?saddr="+start_address+"&daddr="+end_location;
				window.open(directions_url,'directions');
				
				return false;
			});
		} else {
			setupMenuControls();
			menuPaginate();
		}
		
		//show menu
		$("#"+settings.locations_menu_id).show();
	};
	function getIcons(count){
		str_icon_location = settings.images_directory+"/icon_marker_"+(count)+".gif";	
		var location_icon = new google.maps.MarkerImage(
			str_icon_location,
			new google.maps.Size(settings.icon_width, settings.icon_height),
			new google.maps.Point(0,0)
		);
		return location_icon;
	};
	function createLocationMarkers(){

		var json = settings.json;
		var ii=0;
		if  (!!json.countries) {
			jsonOBJ = json.countries;
			for (var prop in jsonOBJ) {
			 	if (jsonOBJ.hasOwnProperty(prop)) {
					
					var html = '<a href="'+($('#map_url').attr('href')||json.countryurl)+jsonOBJ[prop].id+'">'+(jsonOBJ[prop].count + ' Faculty Member'+((jsonOBJ[prop].count===1)?'':'s'))+'</a>';
					var point = new google.maps.LatLng(jsonOBJ[prop].latitude, jsonOBJ[prop].longitude);

					var marker = createMarker(
									point, jsonOBJ[prop].latitude, jsonOBJ[prop].longitude, 
									ii++, 0, prop, html, getIcons(jsonOBJ[prop].count), jsonOBJ[prop].count);
										
					location_markers.push(marker);
				}
			}
		}else{
			jsonOBJ = json.cities;
			
			settings.auto_zoom_to_fit = true;
			for(var i = 0; i < jsonOBJ.length; i++){
				for (var prop in jsonOBJ[i]){
					if (jsonOBJ[i].hasOwnProperty(prop)) {
						var point = new google.maps.LatLng(jsonOBJ[i][prop].latitude, jsonOBJ[i][prop].longitude);
						var name = prop;
						var html = '';
						
						for(var j = 0; j < jsonOBJ[i][prop].faculty.length; j++){
							html+= '<a href="' +
								($('#map_url').attr('href')||json.facultybaseurl)+
								jsonOBJ[i][prop].faculty[j]['pagename'] +
								'">' + 
								jsonOBJ[i][prop].faculty[j]['firstname'] +
								' ' + 
								jsonOBJ[i][prop].faculty[j]['lastname'] +
								'</a><br/>';
						}
						var marker = createMarker(point, jsonOBJ[i][prop].latitude, jsonOBJ[i][prop].longitude, 
										ii++, 0, name, html, getIcons(jsonOBJ[i][prop].count), jsonOBJ[i][prop].count);
						location_markers.push(marker);
					}
				}
			}
			if(settings.auto_zoom_to_fit){
				if(location_markers.length>1){
					var bounds = new google.maps.LatLngBounds();
					for (var i = 0; i < location_markers.length; i++) {
					  bounds.extend(location_markers[i].position);
					}
					map.fitBounds(bounds);
				}else{
					map.setZoom(4);
	   				map.setCenter(location_markers[0].position);
   				}	
			}
		}
	};
	function createMarker(point, lat, long, index, xml_index, name, html, icon, count) {
		
		//instantiate new google maps marker
		var marker = new google.maps.Marker({
			position: point,
			map: map,
			icon: icon,
			title: name,
			zIndex: index
		});

		//add properties to marker
		marker.lat = lat;
		marker.long = long;                
		marker.name = name;
		marker.index = index;
		marker.html = html;
		marker.location_id = xml_index;
		marker.count = count;
		marker.icon_height = settings.icon_height;
		marker.icon_width = settings.icon_width;
		
		//store marker in all_markers array
		all_markers.push(marker);
		
		//add event to marker
		google.maps.event.addListener(marker, 'click', function() {
			markerClickHandler(marker);
		});

		return marker;
	};	
	
	function getAddress(node){
		
		//build string with address data
		var address;
		var $node = $(node);

		address = $node.find("address").text();
		if ($node.find("suite").text()){
			address += " " + $node.find("suite").text() + ", ";
		} else {
			address += ", ";
		}
		
		address += $node.find("city").text() +", "+ $node.find("state").text() +" "+ $node.find("zip").text();

		return address;
	};

	function getDirectionsAddress(node){
		
		//build string with address data
		var address;
		var $node = $(node);

		address = $node.find("address").text() +",+";	
		address += $node.find("city").text() +",+"+ $node.find("state").text() +"+"+ $node.find("zip").text();

		return address;
	};

	function getAddressHtml(node){
	
		//build string with address data
		var html;
		var $node = $(node);

		html = "<p>";
		if ($node.find("address").text()){
			html += "<span class='location-address'>"+ $node.find("address").text() +"</span>";
			if (menu_below){ html+=", "; }
		}
		if ($node.find("suite").text()){
			html += "<span class='location-suite'>"+ $node.find("suite").text() +"</span>";
			if (menu_below){ html+=", "; }
		}

		html += "<span class='location-city-st-zip'>"+ $node.find("city").text() +", "+ $node.find("state").text()+" "+ $node.find("zip").text()+"</span>";
		html += "</p>";

		return html;
	};
	
	function getInfoboxHtml(name, html, xml_index, count){

		//build infobox html
		var infobox_html =
			'<div id="infobox" class="infobox-intl">'+

				'<a id="button-close-infowindow" class="close-intl"><img src="/files/images/close_intl.gif"/></a>'+
				'<img src="/files/images/over_shadow.png"/>'+
				'<div id="overlay-main">'+
					'<div id="textarea">'+
						'<h3 class="intl-h3">'+ name + ((!!settings.json.cities)?'<span>('+count+')':'')+'</span></h3>'+ 	
						html +
					'</div></div>'+
					'<img src="/files/images/under_shadow.png"/>' +
				'</div>';

		return infobox_html;
	};
	
	function markerClickHandler(marker){
		active_marker = marker.index;//
		var index = active_marker;
		var icon_height = marker.icon_height;
		var icon_width = marker.icon_width;
		var lat = marker.lat;
		var long = marker.long;
		var title = marker.name;
		var html = marker.html;
		var count = marker.count;
		
		if (!!settings.last_icon[0]){
			all_markers[settings.last_icon[1]].setIcon(
				window.location.protocol + '//' + 
				window.location.host.split('/')[0] + 
				settings.images_directory +
				'icon_marker_' + settings.last_icon[0] + '.gif'
			);
		}
		
		marker.setIcon(
			window.location.protocol + '//' + 
			window.location.host.split('/')[0] + 
			settings.images_directory +
			'icon_marker_orange_' + marker.count + '.gif'
		);
		
		//if infobox exists, remove it
		if (document.getElementById("infobox")){								
			infobox.remove();
		}
		
		//move active marker to top
		for (var i = 0; i < all_markers.length; i++){	
			if (i == index) all_markers[i].setZIndex(999);
			else all_markers[i].setZIndex(undefined);
		}
		
		setMenuActive(index);

		//get infobox html for marker
		var infobox_html = getInfoboxHtml(title, html, index, count);	
		
		//add infobox
		infobox = new InfoBox({
				latlng: marker.getPosition(), //new google.maps.LatLng(marker.getPosition().lat()-(marker.getPosition().lat()*.1),marker.getPosition().lng()-39.8),// 
				map: map,
				content: html, 
				className: "infobox",
				html:infobox_html,
				close_button_id:settings.close_button_id,
				icon_height:icon_height,
				icon_width:icon_width,
				offsetHorizontal_:-100,
				parent:el
			});
			
		settings.last_icon = [marker.count, index];
		return false;
	};

	
	function setDirectionsButton(){
		
		var end_location = all_markers[active_marker].address;
		end_location = end_location.replace(/\s/g,"+");
		var url = "http://maps.google.com/maps?saddr=&daddr="+end_location;
		
		$("#"+settings.organization_directions_id).attr('href',url).attr('target','_blank');
	};

	
	function selectLocation(index){
		
		//event handler for locations menu items, simulates marker click
		var marker = location_markers[index];
		markerClickHandler(marker);

		setMenuActive(index);
		
					
		$('#infobox').click(function(e){
			e.preventDefault();
		});

	};
	
	function setMenuActive(index){
		
		if (settings.display_menu){
			
			$("#"+settings.locations_menu_id+" div.item").each( function(i){
				if (i == index){
					$(this).addClass('active');
				} else {
					$(this).removeClass('active');
				}
			});
		}
	};
	
	function setMenuInactive(){
		$("#"+settings.locations_menu_id+" div.item").removeClass('active');
	};


	function setupMenuControls(){
	
		//add previous event
		$("#"+settings.locations_menu_controls_id+" a#control-previous").click(function(e){
			menuPrevious();
			return false;
		});
	
		//add next event
		$("#"+settings.locations_menu_controls_id+" a#control-next").click(function(e){
			menuNext();
			return false;
		});
	};
	
	function menuNext(){
		
		active_menu_page++;
	
		if (active_menu_page >= total_menu_pages){
			active_menu_page--;
		}

		menuPaginate();
		
		return false;
	};
	
	function menuPrevious(){
		
		active_menu_page--;
		
		if (active_menu_page < 0){
			active_menu_page++;
		}
		
		menuPaginate();
		
		return false;
	};
	
	function menuPaginate(){
		
		
		lower_bound = active_menu_page * settings.visible_menu_items;
		upper_bound = lower_bound + settings.visible_menu_items;

		//console.log('!!! '+ lower_bound +' '+settings.visible_menu_items+' '+upper_bound);
		
		setMenuInactive();


		//try {console.log('menuPaginate '+$("#"+settings.locations_menu_id+" div.item").length+' '+total_locations);} catch(e){}

		active_location_markers = [];

		//show/hide active items in menu, build active location markers array
		$("#"+settings.locations_menu_id+" div.item").each(function(i){
		
			//console.log('total_locations '+total_locations);
			
			var tmp_marker = location_markers[i];

			if (i >= lower_bound && i < upper_bound){
				$(this).show();
				if (tmp_marker){ tmp_marker.setVisible(true); }
				active_location_markers.push(tmp_marker);
			} else {
				$(this).hide();
				if (tmp_marker){ tmp_marker.setVisible(false); }
			}		
			
		});
		
//try { console.log("!menuPaginate  "+active_location_markers.length+'/'+location_markers.length+"/"+ total_locations +"         l:"+ lower_bound +" u:"+ upper_bound +" activepage:"+active_menu_page) } catch(e){}

		//activate/deactivate controls if on first or last page
		if (lower_bound == 0){
			$("#"+settings.locations_menu_controls_id+" a#control-previous").removeClass().addClass('off');
		} else {
			$("#"+settings.locations_menu_controls_id+" a#control-previous").removeClass('off');	
		}
			$("#"+settings.locations_menu_controls_id+" a#control-next").removeClass('off');


		//if infobox exists, remove it
		if (document.getElementById("infobox")){								
			infobox.remove();
		}
		
		
//log('menuPaginate bounds locations '+active_location_markers.length+ "/"+location_markers.length);

		//reset bounds
		var bounds = new google.maps.LatLngBounds();

		for (var i = 0; i < active_location_markers.length; i++){
			bounds.extend(active_location_markers[i].position);
		}

		/*map.fitBounds(bounds);*///this makes it zoom in too far, if there's only one marker
		
		//center on active marker
		var top_marker = location_markers[lower_bound];
		//map.setZoom(settings.initial_zoom);
		var new_center = new google.maps.LatLng( top_marker.lat, top_marker.long );
		map.panTo(new_center, 10);


		return false;
	};
	

$.expr[':'].icontains = function(obj, index, meta, stack){
	return (obj.textContent || obj.innerText || jQuery(obj).text() || '')
		.toLowerCase()
		.indexOf(meta[3].toLowerCase()) >= 0;
};


})(jQuery);