;(function($) {

	//declare and set some variables
	var settings, map, infobox, el, $el, parking, locations, og_locations;

	var marker_icons=[], all_markers=[], icons=[], location_markers=[], parking_markers=[],
		OS_markers=[], NH_markers=[], other_markers=[], NHOS_markers=[], active_location_markers=[];
	
	var total_menu_pages, total_locations, total_parking, parking_visible,
		lat_lng, xml_path, locations_xml_doc, parking_xml_doc, zoomListener,
		filter = "", current_index = 0, active_marker = 0, active_menu_page = 0,
		parking_loaded = false, locations_loaded = false, has_parking = false,
		menu_below = false, results_tabs = false, building_page = false;
		
	//constructor
	$.gmap_locations = function(element, locations_xml, parking_xml, options) {
		//try { console.log('!gmap_locations '+settings.org_id); } catch(e){}
		settings = {};
		locations_xml_doc = locations_xml;
		parking_xml_doc = parking_xml;

		$(element).data('gmap_locations', this);
		
		settings = $.extend({}, $.gmap_locations.defaultOptions, options); 
		
		el = this;
		$el = $(element);
		if (parking_xml_doc){
			has_parking = true;	
			//parking_visible = true;
		}
		//public methods
		this.addFilter = function(terms){
			
			//apply filter
			var nodes = $(og_locations).find("location")
				.filter( function(i){
					var selection = $(this).find(":not(latitude, longitude, buildingType, buildingCode, locationType):icontains('"+terms+"')");
					if ( selection.length > 0 ){ return this; }
				});
			var total = nodes.length;
			if (total < 1){ return false; }
			filter = terms;
			//try{ console.log('addFilter "'+terms+'", '+total); } catch (e){}
			//clear all markers
			//add new markers
			allDataLoaded();
			return total;
		};
		this.clearFilter = function(){
			//try{ console.log('clearFilter'); } catch (e){
			filter = "";
			allDataLoaded();
			//restore original locations markers
		};
		this.getCurrentIndex = function(){
			//try { console.log('gmap getCurrentIndex '+current_index ); } catch(e){}	
			return current_index;
		};
		this.getLocationsData = function(){
			//try { console.log('gmap_locations getLocationsData '+$(og_locations).find("location").length+' '+$(locations).find("location").length ); } catch(e){}
			return og_locations;	
		};
		this.setLocationsData = function(new_locations){
			//try { console.log('gmap setLocationsData '+$(og_locations).find('location').length+' '+$(new_locations).find('location').length ); } catch(e){}
			locations = new_locations;
			allDataLoaded();
		};
		this.selectLocationByIndex = function(index){
		//function for external links to simulate marker click
			markerClickHandler(location_markers[index]);
		};
		
		this.infoboxAddedHandler = function(){
			infoboxAdded();
		};
/*		this.reset = function(){
			//restore original locations data
			//try { console.log('reset '+$(og_locations).find('location').length) } catch(e){}		
			locations = $(og_locations).clone();
			allDataLoaded();
		};*/
		init(element, settings);
	};
	
	//return instance
	$.fn.gmap_locations = function(locations_xml_doc, parking_xml_doc, settings) {    
		return this.each(function(i) {			 
			(new $.gmap_locations( $(this), locations_xml_doc, parking_xml_doc, settings) );              
		});        
	};

	//default options
	$.gmap_locations.defaultOptions = {
		class_name:'gmap_locations',
		images_directory: '/files/images/',//images
		org_id:'org-id',
		loc_id:'loc-id',
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
		initial_zoom: 16,
		initial_lat: 41.3036670,
		initial_long: -72.9351210,
		map_canvas_id: 'map-canvas',
		locations_menu_id: 'map-sidebar',
		locations_menu_controls_id: 'location-controls',
		menu_below_class: 'menu-below',
		results_tabs_class: 'results-tab',
		button_parking_id: 'button-toggle-parking',
		close_button_id: 'button-close-infowindow',
		close_button_id: 'button-close-infowindow',
		total_numbered_icons: 20,
		directions_link: null,
		use_google_directions: false,
		use_google_directions_id: 'use-google-directions',
		auto_zoom_to_fit: true,
		show_parking: true,
		show_parking_id:'showparking',
		show_organizations_id:'show-organizations',
		show_organizations:false,
		organizations_feed_url:'/System_Files/Handlers/GoogleMapsProxy.ashx',
		organizations_target_id: 'location-detail',
		organization_directions_id: 'button-get-directions'
	};
	//private methods
	function init(element, settings){  
		/*log('gmap init !');*/	 
		getParams(); 
		$('#map-canvas').addClass('loading');
		if ($('#'+settings.map_canvas_id).parents('.tabset-page').length){
			var $tabset = $('#'+settings.map_canvas_id).parents('.tabset-page');
			var $link = $('a[href="#'+$tabset.attr('id')+ '"]');
			setTimeout(function(){			
				if($link.parent().hasClass('active')) doit();
				else $link.bind('click', function(e){doit()});		
			},1000);			
		}else{
			doit(); 
		}
	};
	function doit(){
		buildMap();	
		loadLocationsXML();
		if(has_parking) loadParkingXML();
	};
	function log(s){
		if (typeof console != "undefined" && typeof console.debug != "undefined") {
			console.log(s);
		} else {
			//alert(s);
		}
	};
	function getParams(){
		
		if ($('#'+settings.mode_id).length)	settings.mode = $('#'+settings.mode_id).text();
		if ( $('#menu-below').html() == "true"){
			menu_below = true;
			$el.css('height','auto');
			$('#'+settings.map_canvas_id).css('float','none');
			$('#'+settings.locations_menu_id).addClass(settings.menu_below_class);
			
			if ( $('#'+settings.results_tabs_class).text() == "true"){
				$('.tabset-page').addClass(settings.results_tabs_class);
				results_tabs = true; 
			}
		} 
		if (!$('#'+settings.show_parking_id).length) parking_visible = settings.show_parking;
		else parking_visible = settings.use_google_directions = ( $('#'+settings.show_parking_id).text() === 'true');
		if ($('#'+settings.use_google_directions_id).length) settings.use_google_directions = ( $('#'+settings.use_google_directions_id).text() === 'true');
		if ($('#'+settings.display_menu_id).length) settings.display_menu = ( $('#'+settings.display_menu_id).text() === 'true');
		if ($('#'+settings.show_first_infobox_id).length) settings.show_first_infobox = ( $('#'+settings.show_first_infobox_id).text() === 'true');
		if ($('#'+settings.short_menu_text_id).length) settings.short_menu_text = ( $('#'+settings.short_menu_text_id).text() === 'true');
		if ($('#'+settings.visible_menu_items_id).length) settings.visible_menu_items = parseInt( $('#'+settings.visible_menu_items_id).text() );
		
		if (($('#'+settings.loc_id).length && $.trim($('#'+settings.loc_id).text())!='')||window.location.search.indexOf('locid')>-1){ 
			building_page = true;
			if ($('#'+settings.loc_id).length && $.trim($('#'+settings.loc_id).text())!='') settings.loc_id = $.trim($('#'+settings.loc_id).text());
			if (window.location.search.indexOf('locid')>-1) settings.loc_id = window.location.search.split('locid=')[1].split('&')[0];
			xml_path = locations_xml_doc + "?mode=" + settings.mode + "&locationid=" +settings.loc_id;
		}else{ 
			xml_path = locations_xml_doc + "?mode=" + settings.mode + "&orgid=" + $.trim($('#'+settings.org_id).text());
		}
		settings.organizations_feed_url = 'http://'+ document.domain + settings.organizations_feed_url+'?mode=';//'/System_Files/Handlers/GoogleMapsProxy3.ashx.xml?mode=';/
		//try{ console.log(settings.use_google_directions+' '+ settings.display_menu+' '+settings.show_first_infobox+' '+settings.short_menu_text+' '+settings.visible_menu_items); }catch(e){}
	};
	
	function buildMap(){
		//log('buildMap '+settings.initial_zoom);
		lat_lng = new google.maps.LatLng( settings.initial_lat, settings.initial_long );
		//initial settings object
		var init_obj = (!building_page) ? {
			zoom: settings.initial_zoom,
			center: lat_lng,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			mapTypeControl: false,
			scrollwheel: true		
		}:{
			zoom: settings.initial_zoom,
			center: lat_lng,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			mapTypeControl: false, //map sat
			panControl: true,
			zoomControl: true,
			panControlOptions: {
				position: google.maps.ControlPosition.LEFT_CENTER
			},
			zoomControlOptions: {
				position: google.maps.ControlPosition.LEFT_CENTER
			}
			/*panControlOptions: {
				position: google.maps.ControlPosition.TOP_RIGHT
			},zoomControl: true,
			zoomControlOptions: {
				style: google.maps.ZoomControlStyle.SMALL,
				position: google.maps.ControlPosition.LEFT_CENTER
			},scaleControl: true*/
		};
		
		//create map
		map = new google.maps.Map( document.getElementById(settings.map_canvas_id), init_obj );
		google.maps.event.addListenerOnce(map, 'tilesloaded', function(){
			//this part runs when the mapobject is created and rendered
			google.maps.event.addListenerOnce(map, 'tilesloaded', function(){
				$('#map-canvas').css({'visibility':'visible'}).removeClass('loading');
			});
		});
		if(building_page) createBackButton();
		//prevent zooming in too far
/*		google.maps.event.addListener(map, 'zoom_changed', function() {
			//google.maps.event.removeListener(zoomListener);
			if (this.getZoom() > 19) { this.setZoom(19); }
		});*/
	};
	function loadLocationsXML(attempts){
		if (arguments.length) attempts++; else var attempts=0;
		//try { console.log('loadLocationsXML:::: '+xml_path); } catch(e){} 
		$.ajax({
			type: "GET",
			url: xml_path,//'/System_Files/Handlers/GoogleMapsProxy7.ashx.xml',//
			dataType: "xml",
			data: "",
			error: function(result, textStatus, errorThrown){//settings.loc_id 
				try {
					console.log('Error loading map location data. '+result.statusText+", "+textStatus+", "+result.responseText+", "+errorThrown);	
				} catch(e){};
			},
			success: function(xml){
				if((settings.mode!='people' && building_page) && (!$(xml).find('organization').length && !attempts)){
					xml_path = xml_path.replace('&locationid=','&orgid=').replace('mode=organizations','mode=location');
					loadLocationsXML(attempts);
				}else{	
					var LocationID=-1, temp;
					$(xml).find('LocationID').each(function(){
						temp = $.trim(parseInt($(this).text()));
						if( temp === LocationID ) $(this).parent().remove();
						LocationID = temp;
					});
					//this sets up xml for inside new haven and outside new haven
					if (results_tabs) {
						$(xml).find("Location").each(function(){
							var pcl = true;
							$(this).find('Type').each(function(){
								if($(this).text()=='Patient Care Location') pcl = false;
							});
							if (pcl) $(this).remove();
						});
						$(xml).find('Location').each(function(){
							if (!$(this).find('buildingName').length) $(this).append('<buildingName>'+$(this).find('address').text()+'</buildingName>');
						});
						xml = $(xml).find("Location").sort(
							function(a_,b_){
								var a = $(a_).find('buildingName').text(), b = $(b_).find('buildingName').text();
								return ((a==b)?0:((a>b)?1:-1));
							}
						).wrap('Location');

						NHOS_markers = createLocationMarkers($(xml).filter(function(){return $(this).find("city").length}));
							var NHnodes = $(xml).filter(function(){return $(this).find("city").text()=="New Haven"}),
								OSnodes = $(xml).filter(function(){return $(this).find("city").text()!="New Haven"}).sort(
									function(a,b){return $(a).find('city').text()==$(b).find('city').text()?0:($(a).find('city').text()>$(b).find('city').text()?1:-1)});
						OS_markers = createLocationMarkers(OSnodes); NH_markers = createLocationMarkers(NHnodes);
					}
					locations = xml;
					og_locations = xml;
					dataLoadedLocations();
				}
			}
		});
	};

	function loadParkingXML(){
		//try { console.log('loadParkingXML'); } catch(e){}

		$.ajax({
			type: "GET",
			url: parking_xml_doc,
			dataType: "xml",
			data: "",
			error: function(XMLHttpRequest, textStatus, errorThrown){
				try {
					console.log('Error loading map parking data. '+XMLHttpRequest.statusText+", "+textStatus+", "+xhr.responseText+", "+errorThrown);	
				} catch(e){};
			},
			success: function(xml){
				parking = xml;
				dataLoadedParking();
			}
		});
	};

	function loadPhysicians(orgIDs){
	
		$.ajax({
			type: "GET",
			url: settings.organizations_feed_url+'people&locationid='+window.location.search.split('clnid=')[1].split('&')[0]+'&orgid='+$('#org-id').text(),//+orgIDs,
			dataType: "xml",
			data: "",
			error: function(XMLHttpRequest, textStatus, errorThrown){
				try {
					console.log('Error loading map physicians data. '+XMLHttpRequest.statusText+", "+textStatus+", "+xhr.responseText+", "+errorThrown);	
				} catch(e){};
			},
			success: function(xml){
				
					xml = $(xml).find("facultyMember").filter(function(){
							return $.trim($(this).find("OrganizationType").text())=="Patient Care"}).sort(
							function(a,b){return $(a).find('LastName').text()==$(b).find('LastName').text()?0:($(a).find('LastName').text()>$(b).find('LastName').text()?1:-1)});
				dataLoadedPhysicians(xml);
				
			}
	
		});
	};

	function loadOrganizationsXML(location_id){
		//try { console.log('loadOrganizationsXML '+location_id); } catch(e){}
		$.ajax({
			type: "GET",
			url: settings.organizations_feed_url + '?mode=organizations&locationid='+location_id,
			dataType: "xml",
			data: "",
			error: function(XMLHttpRequest, textStatus, errorThrown){
				try {
					//no organizations or problem with feed
					$('#'+settings.organizations_target_id).hide();
					console.log('gmap_locations: Error loading map organizations data.', XMLHttpRequest, textStatus, errorThrown, location_id);			
					//console.log('Error loading map organizations data. '+XMLHttpRequest.statusText+", "+textStatus+", "+xhr.responseText+", "+errorThrown);	
				} catch(e){};
			},
			success: function(xml){
				displayOrganizations(xml);
			}
		});
	};
	
	
	function dataLoadedLocations(){
		//try { console.log('dataLoadedLocations'); } catch(e){}

		locations_loaded = true;

		if (has_parking){
			if (parking_loaded){
				allDataLoaded();
			}
		} else {
			allDataLoaded();
		}
	};
	
	
	function dataLoadedParking(){
		//try { console.log('dataLoadedParking '+parking); } catch(e){}
		parking_loaded = true;
		//total_parking = $(parking).find("location").size();	

		if (locations_loaded){
			allDataLoaded();	
		}
	};

	function allDataLoaded(){
		//try { console.log('allDataLoaded', $(location_markers).length); } catch(e){}
		
		//set up menu, markers, center vieworganization info
		
		//clear existing markers
		$(location_markers).each(function () {
			this.setMap(null);
		});
		
		$(active_location_markers).each(function () {
			this.setMap(null);
		});
		
		$(parking_markers).each(function () {
			this.setMap(null);
		});
		location_markers = [];
		active_location_markers = [];
		parking_markers = [];

		//reset menu
		active_menu_page = 0;
		
		total_locations = getTotalLocations();
		total_parking = $(parking).find("location").size();
	
		settings.total_numbered_icons = total_locations;
		preloadIconImages();
		
		//don't show menu if 1 total_location
		/*if (total_locations == 1){
			settings.display_menu = false;
		}*/
		
		
		//center map on 1st location
		var lat;
		var long;
		$(locations).find("location").each(function(i){
			if (i == 0){
				lat = $(this).find("latitude").text();
				long = $(this).find("longitude").text();		
			}			  
		});
		if (has_parking){
			setupParking();
		}
		createLocationMarkers();

		//build locations menu
		if (settings.display_menu){
			total_menu_pages = Math.ceil(total_locations/settings.visible_menu_items);
			switch(true) {
				case results_tabs: buildResultTabs(); break; 
				case building_page: buildBuildingsPage(); break; 
				default: buildLocationsMenu();
			}
		} else {
			var new_width = $('#'+el['selector']).width();
			$('#'+settings.locations_menu_id).hide();
			$('#'+settings.map_canvas_id).css('width',new_width - 2);
		}

		//get directions button on location detail
		if ( $('#'+settings.show_organizations_id).text() == 'true'){
			settings.show_organizations = true;
		} else {
			settings.show_organizations = false;
		}
		//prepare organizations area
		if (settings.show_organizations){
			
			if ( $('#'+settings.organizations_target_id).length > 0 ){
				$('#'+settings.organizations_target_id).remove();
				
			}
			$('#'+settings.map_canvas_id).after('<div id="'+settings.organizations_target_id+'"></div>');
			$("#"+settings.organizations_target_id).hide();
			loadOrganizationsXML(all_markers[0].location_id);	
		}
	};
	function setupParking(){
		createParkingMarkers();
		setupParkingVisibility();
	};
	function setupParkingVisibility(){

		//show parking button
		$("#"+settings.button_parking_id).show();
		//add parking button event
		$("#"+settings.button_parking_id+" a").live('click',function(e){
			toggleParking();
			return false;
		});
		//set parking button text
		if (parking_visible){
			$("#"+settings.button_parking_id+" span").html("Hide Parking");
		} else {
			$("#"+settings.button_parking_id+" span").html("Show Parking");
		}
		
		//show/hide parking markers
		for (var i = 0; i < total_parking; i++) {
			var tmp_marker = parking_markers[i];
			if (parking_visible){
				if (tmp_marker.category == "parking") {
					tmp_marker.setVisible(true);
				}
			} else {
				if (tmp_marker.category == "parking") {
					tmp_marker.setVisible(false);
				}
			}
		}
	};
	function infoboxAdded(){
	
		//add close button event
		$("a#button-close-infowindow").click(function(e){
			e.preventDefault();
			infobox.remove();
			return false;
		});
		
		if (settings.directions_link){
			//add show directions button event
			$("a#button-directions").click(function(e){
				var xml_index = $(this).attr("rel");
				var url = settings.directions_link +"?index="+ xml_index;
	
				document.location = url;
				
				return false;
			});
		}
		
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
	
	function getTotalLocations(){
		//apply filter
		var nodes = $(og_locations).find("location").filter( function(i){
			var selection = $(this).find(":not(latitude, longitude, buildingType, buildingCode, locationType):icontains('"+filter+"')");
			if ( selection.length > 0 ){ return this; }
		});
		var total = ((building_page)?1:nodes.length);	
		return total;
	};
	function createBackButton(){
		var back_link = document.createElement('div');
			back_link.className = 'map-back-link'; //console.log()
			var link_command=$('#back-url').attr('href') + window.location.hash;
			back_link.innerHTML = '<div style="margin-top: -3px"><A HREF="'+link_command+'"><img src="/files/images/map_arrow_rt.gif" alt="Return to Locations Map"/>Return to Locations Map</a></div>'
			map.controls[google.maps.ControlPosition.TOP_LEFT].push(back_link);		
	};
	function buildingsTitleDisplay($locNode,locations){
		if(locations) return '<div><img src="'+settings.images_directory+'/icon_marker_single.gif" alt="'+$locNode.find('buildingName').text()+
				'" class="floatlt-plain" style="margin:-4px 5px 0 0"/><div style="margin:-7px 0 15px 0"><h1 style="display:inline-block;padding:0 7px 0 0" id="_address1_">'+
				$locNode.find('buildingName').text()+'</h1><span id="_address2_">'+$locNode.find('address').text()+', '+$locNode.find('city').text()+', '+$locNode.find('state').text()+' '+$locNode.find('zip').text()+
				'</span></div></div>';
		else return '<div><img src="'+settings.images_directory+'/icon_marker_single.gif" alt="'+$locNode.attr('loc')+
				'" class="floatlt-plain" style="margin:-4px 5px 0 0"/><div style="margin:-7px 0 15px 0"><h1 style="display:inline-block;padding:0 7px 0 0" id="_address1_">'+
				$locNode.attr('loc')+'</h1><span id="_address2_">'+$locNode.attr('add1')+', '+$locNode.attr('city')+', '+$locNode.attr('state')+' '+$locNode.attr('zip')+
				'</span></div></div>';
		
	};
	function buildBuildingsPage(){
		
		if($(og_locations).find("organization").length){
			var nodes = $(og_locations).find("organization").filter( function(){
				return $(this).find("ymgStatus").text()=="Y"
			}), 
			
			nodeLen=$(nodes).length, 
			url = ($('#root-url').length && $('#root-url').attr('href')!='')? $('#root-url').attr('href') : location.protocol+'//'+location.host+location.pathname;
			
			$(nodes).each(function(i){
				
				var $locNode = $(this).find("locations location"), phoneNode= $(this).find("GeneralPhoneNumbers"), phonestr='<h3 class="green bold inline">Phone:</h3> ';
				
				if(!i) $('#'+settings.locations_menu_id).append(buildingsTitleDisplay($locNode,0)+'<h2 style="display:inline-block; clear:both">YMG organizations in this location<span style="color:#585858" class="space-left-10"> ('+nodeLen+
					')</span></h2><div class="callout-box-filled ymg" style="padding-top:0"><div class="third col0" style="width:300px;margin:0 0 15px"></div><div class="third col1" style="width:300px;margin:0 10px 15px"></div><div class="third col2" style="width:300px;margin:0 0 15px"></div></div>');

				switch (true) {		
					case ($(this).find("phone").length && $.trim($(this).find("phone").text()) !=''): 		
						phonestr+=$.trim($(this).find("phone").text()); break;
					case ($(phoneNode).children().first().length && $.trim($(phoneNode).children().first().text()).length>2):  
						phonestr+=$.trim($(phoneNode).children().first().text().split(':')[1]);  break;
					//case ($locNode.attr('appointmentPhone').length && $locNode.attr('appointmentPhone')!=''): //phonestr+=$locNode.attr('appointmentPhone'); break;
					default:phonestr=''; 
				}
				$('.callout-box-filled.ymg:first .col'+i%3).append('<a class="blue bold block" style="margin-top:15px" href="'+url+'?orgid='+$(this).find('OrgID').text()+'">'+$(this).find('Org_name').text()+'</a>'+phonestr);
			});
		}else{
			$('#'+settings.locations_menu_id).html(buildingsTitleDisplay($(og_locations).find("location"),1))
		}
		loadPhysicians();
	};
	function dataLoadedPhysicians(xml){
		if (!$(xml).length) return; 
		$('#'+settings.locations_menu_id).append('<h2 style="display:inline-block; clear:both">YMG Physicians in this location<span style="color:#585858" class="space-left-10"> ('+
			$(xml).length+')</span></h2><div class="callout-box-filled ymg" style="padding-top:0"></div>');
		var specObj={}, specArr=[], split = '%&#';
		$(xml).each(function(i){
			var spec = getSpecs($(this).find('Specialties'));
			specObj[spec]=(!(spec in specObj)?'':specObj[spec])+$.trim($(this).find('UPI').text())+split;
		});
		for(specs in specObj) specArr.push(specs); specArr.sort();
		for(var j in specArr){
			$('.callout-box-filled.ymg:last').append('<div class="clear clearfix" style="padding-top:10px"><div class="middle-lined small-margin-bottom"><span class="bold green">'+
			((specArr[j]=='zzz')?'Also at this location...':specArr[j])+'</span></div>');
			var UPI = specObj[specArr[j]].split(split);
			for(var i = 0; i < UPI.length; i++){
				if(UPI[i]!=''){
					var member = $(xml).find("UPI:contains('" + UPI[i] + "')").parent();
					$('.callout-box-filled.ymg:last').append('<div style="float:left; width:33%; overflow:hidden; margin-bottom:10px;"><a class="blue bold block" href="'+
					$('#profile-url').attr('href')+$(member).find('pageName').text()+'.profile?source=news">'+ getFullName(member) + '</a>' + (($(member).find('clinicPhone').length)? $(member).find('clinicPhone').text():'&nbsp;'))+'</div>';	
				}
			}
			$('.callout-box-filled.ymg:last').append('</div>')
		}
	};
	function getSpecs(specs){
		switch ($(specs).children().length){
			case 0: return 'zzz'; break;
			case 1: case 2: 
			return (($.trim($(specs).children().eq(0).text()).length)? $(specs).children().eq(0).text():'zzz'); break;
			default: return $.trim($(specs).children().eq(2).text());
		}
	};
	function getFullName(member){
		var hasSuff = false, memberName = $(member).find('FirstName').text()+' '+$(member).find('MiddleName').text()+' '+ $(member).find('LastName').text();
		if ($(member).find('suffix').length){
			memberName+=', '+$(member).find('suffix').text();
			hasSuff=true;
		}
		if(memberName.length>36) return memberName;
		
		if ($(member).find('Degree').length && $.trim($(member).find('Degree').text()).length
			&& (($(member).find('Degree').text().length + memberName.length)<36)) {
			memberName+=', '+$(member).find('Degree').text(); return memberName;
		}
		if ($(member).find('professionalSuffix').length && $.trim($(member).find('professionalSuffix').text()).length 
			&& (($(member).find('professionalSuffix').text().length + memberName.length)<36)) 
			memberName+=', '+$(member).find('professionalSuffix').text(); return memberName;
	};
	function buildResultTabs(){
		//hide location menu
		$('.tabset-group').prepend('<style>li.active a,li.active a:visited,li.active a:active{color:#4c9419;font-weight:bold}</style>'); 
		
		$("#"+settings.locations_menu_id).hide();
		$("#"+settings.locations_menu_id+' div.item').remove();
		
		var nodes = $(og_locations);
		
		var ALLarr=[], NHarr=[], OSarr=[], arrs3=[], cities=[], sorted=[], cityObj={};
		//create sorted citiesObj	
		$(nodes).find("city").each(
			function(i){
				if($.trim($(this).text())!='New Haven') cities[i] = $.trim($(this).text())//change to nhnodes
			}
		); 
		cities.sort();
		
		for(var j=0; j<cities.length; j++) cityObj[cities[j]]=[];

		$(nodes).each( function(i){
			
			var address = getAddressHtml($(this)), 
				city = $.trim($(this).find("city").text()),
				directions = "http://maps.google.com/maps?saddr=&daddr="+getAddressHtml($(this)).replace(/\s/g,"+"),
				item_title = ($(this).find("buildingName").text())? $(this).find("buildingName").text():$(this).find("address").text();
		
			ALLarr.push ('<div class="item '+city.replace(/\s/g,"-")+'"><span class="LocationID hidden">'+$.trim($(this).find("LocationID").text())+
						'</span><span class="ClinicID hidden">'+$.trim($(this).find("clinicid").text())+'</span><span class="lon hidden">'+
						$(this).find("longitude").text()+'</span><span class="lat hidden">'+$(this).find("latitude").text()+'</span>'+
						'<div class="floatlt space-right-10" style="height:66px"></div>'+
						'<div class="wrapper space-right block"><strong class="blue block">'+item_title+'</strong>'+address+'</div></div>');

			if (city=='New Haven'){  
				NHarr.push(ALLarr[i]);
			}else{
				cityObj[city].push(OSarr.length);
				OSarr.push(ALLarr[i]);
			}
		});
		
		for(cities in cityObj){
			if(cityObj.hasOwnProperty(cities) && cities!="undefined"){
				for(j=0; j<cityObj[cities].length; j++){
					sorted.push(((!j)?'<h3 class="_ no-space-top">'+cities+'</h3>':'')+OSarr[cityObj[cities][j]]);
				}
			}
		}
		arrs3=[ALLarr,NHarr,sorted];
		$('.tabset-page').each(function(i){
			this.innerHTML ='<div class="third col0"></div><div class="third col1"></div><div class="third col2"></div>';
		});
		placeInCols(arrs3);
		
		//add click events to menu items
		$(".tabset-content div.item").click(function(e, i){
			e.preventDefault();
			if($(this).find('span.LocationID').text()!=''&& $(this).find('span.LocationID').text()!=''){
				window.location=$('#root-url').attr('href')+'?locid='+$(this).find('span.LocationID').text()+'&clnid='+$(this).find('span.ClinicID').text()+
				'&lat='+$(this).find("span.lat").text()+'&lon='+$(this).find("span.lon").text()+((window.location.hash)?window.location.hash:'');
			}else{
				var index = $(this).find('img').attr("alt") - 1;
				selectLocation(index);
				if (menu_below){
					var y = $("#"+settings.map_canvas_id).offset().top - 35;//35px space above map
					$('html,body').animate({scrollTop: y}, 1000);	
				}
			}
			return false;
		});
		$('.tabset li a').bind('click',function(i){
			locationsView(parseInt($(this).attr('href').slice(-1)));
		});
	};		
	function locationsView(i){
		var removem=[], showem=[];
		switch(i){
			case 1:removem[0]=NH_markers; removem[1]=OS_markers; showem=NHOS_markers; break;
			case 2:removem[0]=NHOS_markers; removem[1]=OS_markers; showem=NH_markers; break;
			case 3:removem[0]=NHOS_markers; removem[1]=NH_markers; showem=OS_markers; break;
			default:return;
		}
		var bounds = new google.maps.LatLngBounds(), opt = {minZoom: 9, maxZoom: null };
		map.setOptions(opt);
		
		for (var i=0;i<showem.length;i++) {
			showem[i].setVisible(true);
			bounds.extend(showem[i].position);
		}
		for (var i=0;i<removem.length;i++) for(var j=0;j<removem[i].length;j++) removem[i][j].setVisible(false);
		map.fitBounds(bounds);
		opt = { minZoom: null, maxZoom: null };
		map.setOptions(opt);
	};
	//note if we need other column layouts later: 
	//Math.ceil(len/numcols) and use as increment, 0 base, then 1, 2 base
	function placeInCols(arr){
		for(var i=0; i<arr.length; i++){
			if (!arr[i].length) {
				$('#page'+(i+1)).text('There are no results for "'+ $('a[href*="#page'+(i+1)+'"]').text() +'"'); 
			}else{
				var len = arr[i].length;		
				for(var j=0; j<arr[i].length; j++){ 
					switch(true){
						case(j<Math.ceil(len/3)):k=0; break;
						case(j<len--):k=1; break;
						default:k=2;
					}  
					var $item = $(arr[i][j]); $item.find('div:first').append('<img src="'+settings.images_directory+'/icon_marker_'+(j+1)+'.gif" alt="'+(j+1)+'" />');
					$('#page'+(i+1)).find('.col'+k).append($item);

				}
			} 
		}	 
		setTimeout(function(){
			if(location.hash) 
				locationsView(parseInt(location.hash.slice(-1)))
		},1000);
		
		$('#map-canvas').css({'visibility':'visible'}).removeClass('not-vis');
		
		var city = $('#page3 .col0 h3:last').text().replace(/\s/g,"-")||'xxx';
		$('#page3 .col1 .' + city).appendTo('#page3 .col0')
		city = $('#page3 .col1 h3:last').text().replace(/\s/g,"-")||'xxx';
		 $('#page3 .col2 .' + city).appendTo('#page3 .col1')
	};
	function buildLocationsMenu(){
	
		//hide location menu
		$("#"+settings.locations_menu_id).hide();
		$("#"+settings.locations_menu_id+' div.item').remove();
		//apply filter
		var nodes = $(og_locations).find("location").filter( function(i){
			var selection = $(this).find(":not(latitude, longitude, buildingType, buildingCode, locationType):icontains('"+filter+"')");
			if ( selection.length > 0 ){ return this; }		
		});

		//try { console.log( '!!!!! buildLocationsMenu   '+ $(nodes).length ); } catch(e) {}
		
		$(nodes).each( function(i){
			var $node = $(this);
			//add html for individual menu items
			var address = getAddressHtml( $node );

			var item_title;
			if ($node.find("locationName").text()){
				item_title = $node.find("locationName").text();
			} else {
				item_title = $node.find("buildingName").text();
			}
			//item footer text
			var item_footer;
			var has_hours = false;
			var has_phone = false;
			
			if ($node.find("hours").length > 0) has_hours = true;
			if ($node.find("infoPhone").length > 0 || $node.find("faxPhone").length > 0) has_phone = true;
			if (has_hours && has_phone) item_footer = "Show Hours/Phone";
			if (has_hours && !has_phone) item_footer = "Show Hours";
			if (!has_hours && has_phone) item_footer = "Show Phone";
			if (!has_hours && !has_phone) item_footer = "Show More";
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
	
	function preloadIconImages(){
		if (total_locations == 1){
			//preload icon images without a number
			marker_icons[0] = new Image();
			marker_icons[0].src = settings.images_directory+"/icon_marker_single.gif";
			
		} else {
			//preload icon images for numbered markers
			for (i = 1; i <= settings.total_numbered_icons; i++){
				marker_icons[i] = new Image();
				marker_icons[i].src = settings.images_directory+"/icon_marker_"+i+".gif";
			}
		}
	};
	
	function createLocationMarkers(arg_nodes){
		//try { console.log('createLocationMarkers'); } catch(e){}
		var nodes, query, point, other_locations = (arguments.length>0);
		//apply filter
		switch(true) {
			case other_locations: nodes=arg_nodes; other_markers=[]; break;
			case building_page: nodes = (($(locations).find('location').length)?$(locations).find('location'):$(locations).find("organization")); break; 
			default: var l = ($(og_locations).find("location").length)?'l':'L';
					nodes = $(og_locations).find(l+"ocation").filter( function(i){
					 var selection = $(this).find(":not(latitude, longitude, buildingType, buildingCode, locationType):icontains('"+filter+"')");
					  if ( selection.length > 0 ){return this} 
			});
		}

		$(nodes).each( function(i){
			if(building_page&&i) return false;	
			var node, $this = $(this);

			if (filter.length) node = $this.parent(); //settings.initial_lat
			
			if (building_page){
				var lat =  window.location.search.split('lat=')[1].split('&lon=')[0],
					lon =  window.location.search.split('lon=')[1],
					name = $this.find("LocationID").attr('locName'),
					location_id = $this.find("LocationID").attr('id');
			}else{
				var lat = parseFloat($this.find("latitude").text()),
					lon = parseFloat($this.find("longitude").text()),
					name = $this.find("buildingName").text(),
					location_id = $this.find("LocationID").text();
			}
			//if no lat/lon, ignore this location
			if (!lat || !lon) return;
			
			var clinic_id = ((results_tabs)?$this.find("clinicid").text():'');
			var point = new google.maps.LatLng(lat, lon),
				html = getMarkerHtml($this), address = getAddress($this),
				directions_address = getDirectionsAddress($this),
				str_icon_location = settings.images_directory+((building_page)?'/icon_marker_single.gif':'/icon_marker_'+(i+1)+'.gif'),
				icon_height = 35, icon_width = 28, icon_center = 14, category = "locations",
				location_icon = 
					new google.maps.MarkerImage(
						str_icon_location,
						new google.maps.Size(icon_width, icon_height),
						new google.maps.Point(0,0),
						new google.maps.Point(icon_center, icon_height)
					);
			var marker = createMarker(point, lat, lon, category, i, location_id, name, html, address, directions_address, location_icon, icon_height, icon_width, clinic_id);
				
			if(other_locations) other_markers.push(marker); else location_markers.push(marker);
		});

		total_locations = location_markers.length;

		//set map bounds to show all (active) markers
		//log('gmap auto_zoom_to_fit '+settings.auto_zoom_to_fit);
	
		if (settings.auto_zoom_to_fit){
			if (settings.display_menu && !menu_below){
				//paginate sets bounds so, don't need to here
				return;
			}
			
			var bounds = new google.maps.LatLngBounds();
			
			if (active_location_markers.length > 0){
				for (var i = 0; i < active_location_markers.length; i++){
					//try { console.log('bounds active_locations '+active_location_markers.length);  } catch(e){}
					bounds.extend(active_location_markers[i].position);
				}
			} else {
				//haven't filtered locations, use all markers
				for (var i = 0; i < location_markers.length; i++){
					//try { console.log('bounds locations '+location_markers.length);  } catch(e){}
					bounds.extend(location_markers[i].position);
				}
			}	
			/*//extend bounds to include parking markers
			if (has_parking){
				for (var i = 0; i < parking_markers.length; i++){

					bounds.extend(parking_markers[i].position);
				}
			}*/
			//set bounds to group or center on one
			if (total_locations > 1) {
				map.fitBounds(bounds);
			} else if (total_locations == 1) {
				map.setCenter(bounds.getCenter());
				map.setZoom(settings.initial_zoom);
			}
			//open info box
			if (total_locations == 1 && settings.show_first_infobox == true) {
				markerClickHandler(location_markers[0]);
			}
			//map.fitBounds(bounds);
		}
		if(other_locations) return other_markers;
	};
	
	function createParkingMarkers(){

		/*console.log('createParkingMarkers '+parking+' '+$(parking).children()[0].tagName);
		*/

		//create parking markers
		var icon_height = 34;
		var icon_width = 27;
		var icon_center = 13;

	
		$(parking).find("location").each(function(i){
			
		//console.log(i+'   createParkingMarkers');

			var $this = $(this);

			var lat = parseFloat($(this).find("latitude").text());
			var lon = parseFloat($(this).find("longitude").text());
			
			var point = new google.maps.LatLng(lat, lon);
			var name = $(this).find("buildingName").text();

			var xml_index = i+1;
			
			var html = "<p>";
			html += $(this).find("address").text() +"<br />";
			html += $(this).find("city").text() +", "+ $(this).find("state").text()+" "+ $(this).find("zip").text();
			html += "</p>";

			var restricted;
			var pay_lot = $(this).find("pay_lot").text();
			var restricted_lot = $(this).find("restricted_lot").text();
			var valet_parking = $(this).find("valet_parking").text();

			if (pay_lot == "Y" || restricted_lot == "Y" || valet_parking == "Y"){
				
				html += "<p class='parking-features'>";
				if (restricted_lot == "Y"){
					restricted = true;
					html += "<span class='parking-restricted'>Restricted lot</span>";
					if (pay_lot == "Y" || valet_parking == "Y"){
						html += ", ";
					}
				}
				if (pay_lot == "Y"){
					html += "Pay lot";
					if ( valet_parking == "Y"){
						html += ", ";
					}
				}
				if (valet_parking == "Y"){
					html += "Valet parking";
				}
				html += "</p>";
			}
			if ($(this).find("loc_hours").text()){
				html += "<p>Hours: " + $(this).find("loc_hours").text()+"</p>";
			}
			if ($(this).find("comments").text()){
				html += "<p>" + $(this).find("comments").text()+"</p>";
			}		
			
			
			//var address = getAddress(xml_index, "parking");
			var address = getAddress($this);
			var directions_address = getDirectionsAddress($this);
			
			var category = "parking";
			var icon_path;
			
			if (restricted){
				icon_path = settings.images_directory+"/icon_parking_restricted.gif";
			} else {
				icon_path = settings.images_directory+"/icon_parking.gif";
			}
			var parking_icon = new google.maps.MarkerImage(
				icon_path,
				new google.maps.Size(icon_width, icon_height),
				new google.maps.Point(0,0),
				new google.maps.Point(icon_center, icon_height)
			);
			var marker = createMarker(point, lat, lon, category, i, xml_index, name, html, address, directions_address, parking_icon, icon_height, icon_width);
			parking_markers.push(marker);
		});
	};
	
	function createMarker(point, lat, lon, category, index, xml_index, name, html, address, directions_address, icon, icon_height, icon_width, clinic_id) {
		
		//try { console.log('createMarker'+index); } catch(e){}
		
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
		marker.long = lon;
		marker.category = category;                      
		marker.name = name;
		marker.index = index;
		marker.location_id = xml_index;
		marker.clinic_id = clinic_id;
		marker.html = html;
		marker.icon_height = icon_height;
		marker.icon_width = icon_width;
		marker.address = address;
		marker.directions_address = directions_address;
		
		//store marker in all_markers array
		all_markers.push(marker);
		// console.log(marker.lat,marker.lon,marker.category, marker.name,marker.index,marker.location_id,
		//	marker.html,marker.icon_height,marker.icon_width,marker.address,marker.directions_address)
		//add event to marker
		google.maps.event.addListener(marker, 'click', function() {		
			markerClickHandler(marker);
		});
		return marker;
	};	
	
	
	function getMarkerHtml(node){
		
		var $this = $(node);
		var html = "<p>";
		
		html += $this.find("address").text();
		if ($this.find("suite").text()){
			html += " " + $this.find("suite").text() + "<br />";
		} else {
			html += "<br />";
		}
		
		html += $this.find("city").text() +", "+ $this.find("state").text() +" " + $this.find("zip").text() +"<br />";
		if ($this.find("hours").text()){
			html += "<span class='date-time'>"+ $this.find("hours").text() +"</span><br />";
		}
		html += "</p><p>";
		if ($this.find("infoPhone").text()){
			html += "Office "+ $this.find("infoPhone").text() +"<br />";
		}
		if ($this.find("faxPhone").text()){
			html += "Fax "+ $this.find("faxPhone").text() +"<br />";
		}
		if ($this.find("appointmentPhone").text()){
			html += "Appts "+ $this.find("appointmentPhone").text() +"<br />";
		}
		html += "</p>";
		
		return html;
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
	
	function getInfoboxHtml(name, html, xml_index, lat, long, locid, clnid){
		//build infobox html
		var infobox_html ='<div id="infobox"><a id="button-close-infowindow">Close</a><div id="overlay-main" class="clearfix"><div id="textarea">';
					
		switch(true) {
			case results_tabs: infobox_html+='<h3><a href="'+$('#root-url').attr('href')+'?locid='+locid+'&clnid='+clnid+'&lat='+lat+'&lon='+long+((window.location.hash)?window.location.hash:'')+'" class="results-tabs bold bigger" >'+ name +'</a></h3>'+html; break; 
			case building_page: var arr = $('#_address2_').text().split(','); infobox_html+='<h3>'+$('#_address1_').text() +'</h3><p>'+ arr[0] + '<br/>'+arr[1]+', '+arr[2]+'</p>'; break; 
			default: infobox_html+='<h3>'+ name +'</h3>'+html; break; 
		}
	
		infobox_html+='</div></div>';		
		/*if (settings.directions_link){
			infobox_html += '<div id="overlay-footer">'+
					'<a href="#" id="button-directions" rel="'+xml_index+'">Get Directions</a>'+
				'</div>';
		}*/
		if (settings.use_google_directions){
			infobox_html += '<div id="overlay-footer">'+
					'<a href="#" id="button-directions" rel="'+xml_index+'">Get Directions</a>'+
				'</div>'+
				'<div id="directions">'+
					'<label for="input-directions">Start Address</label>'+
					'<input type="text" name="directions" id="input-directions" />'+
					'<a href="#" id="button-directions-submit">Submit</a>'+
				'</div>';
		}
		
		infobox_html += '</div>';
			
		return infobox_html;
	};
	
	function markerClickHandler(marker){
		
		var index = active_marker = marker.index;
		var index = active_marker, lat = marker.lat, lon = marker.long
		var html = marker.html, location_id = marker.location_id, clinic_id=marker.clinic_id;//aaf

		if (settings.show_organizations){
			loadOrganizationsXML(location_id);	
		}
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
		var infobox_html = getInfoboxHtml(marker.name, html, index, lat, lon, location_id, clinic_id);	
		
		//add infobox
		infobox = new InfoBox({
				latlng: marker.getPosition(),
				map: map,
				content: html, 
				className: "infobox",
				html:infobox_html,
				close_button_id:settings.close_button_id,
				icon_height:marker.icon_height,
				icon_width:marker.icon_width,
				parent:el
			});
		var new_center = new google.maps.LatLng(lat,lon);
		map.panTo(new_center);
		
		return false;
	};

	function displayOrganizations(xml){

	var marker = location_markers[active_marker],//active marker
			location_index = marker.index + 1,
			location_title = marker.title,
			location_address = marker.address,
			formatted_address = location_address.replace(/ /g,'+'),
			location_lat = marker.lat,
			location_long = marker.long,
			streetview_link = 'http://maps.google.com/maps?f=q&source=s_q&hl=en&geocode=&q='+ formatted_address +'&aq=0&vpsrc=6&ie=UTF8&hq=&hnear='+ formatted_address +'&ll='+ location_lat +','+ location_long +'&z=19&layer=c&cbll='+ location_lat +','+ location_long +'&cbp=12,3.15,,0,0';
		
		//try{ console.log(formatted_address) } catch (e){}
		//build html for organizations
		if ($("#"+settings.organizations_target_id).length){
			
			var total = $(xml).find('organization').length;
			var hinge = Math.ceil(total/3); 
			//for dividing into 3 columns
			
			var item_class = (active_marker < 99) ? 'item-number' : 'item-number-wide';
						
			var organizations_html = '<div class="detail-header">'+
				'	<div class="detail-controls">'+
				'		<a href="#" id="'+settings.organization_directions_id +'">Get Directions</a>'+
				'		<a href="'+ streetview_link +'" id="button-street-view" target="_blank">Street View</a>'+
				'	</div>'+
					
				'	<div class="'+item_class+'">'+location_index+'</div>'+
				'	<h2>'+location_title+'</h2>'+
				'	<p>'+location_address+'</p>'+
				'</div>';
				
			if (total){
				organizations_html += '<h3>YSM Organizations in this building</h3>'+
					'<div class="wrapper">'+
					'	<div class="third">';
			

				$(xml).find('organization').each(function(i){

					var $this = $(this);

					if (i == hinge || i == hinge * 2){
						organizations_html += '</div><div class="third">';
					}
					organizations_html += '<p>';
					
					if ( $this.find('org_URL').text().length > 0 ){
						organizations_html += '<a href="'+ $this.find('org_URL').text() +'">'+ $(this).find('Org_name').text() +'</a><br />';
					} else {
						organizations_html +=  '<span class="organization-unlinked">'+ $(this).find('Org_name').text() +'</span><br />';
					}
					
					if ( $this.find('generalPhone').text().length > 0 ){
						organizations_html +=  $(this).find('generalPhone').text();
					}
					organizations_html +=  '</p>';
				});
				organizations_html += '</div></div>';
			} else {
				//try { console.log('gmap: no organizations yet') } catch(e){}	
				
			}
			$("#"+settings.organizations_target_id).html('').html(organizations_html).show();		

			setDirectionsButton();
			//setStreetViewButton();
		} else {

//try { console.log('gmap: no organizations_target_id') } catch(e){}	
		}

	};
	
	function setDirectionsButton(){
		
		var end_location = all_markers[active_marker].address;
		end_location = end_location.replace(/\s/g,"+");
		var url = "http://maps.google.com/maps?saddr=&daddr="+end_location;
		
		$("#"+settings.organization_directions_id).attr('href',url).attr('target','_blank');
	};
	/*function setStreetViewButton(){
		var 	lat = all_markers[active_marker].lat,
			long = all_markers[active_marker].long,
			address = all_markers[active_marker].address;
		address = address.replace(/ /g,"+");
		//var url = 'http://www.google.com/maps?f=q&hl=en&geocode=&time=&date=&ttype=&cbll='+ lat +','+ long +'&layer=c&ie=UTF8&ll='+ lat +','+ long +'&spn=0,359.986911&z=17&cbp=12,229.3,,0,5';
try { console.log("setStreetViewButton  "+lat+" "+long+" "+address);	} catch(e){}
//var url = 'http://maps.google.com/?cbll='+ lat +','+ long +'&cbp=12,20.09,,0,5&layer=c';
var url = 'http://maps.google.com/maps?f=q&source=s_q&hl=en&geocode=&q='+ address +'&aq=0&vpsrc=6&ie=UTF8&hq=&hnear='+ address +'&ll='+ lat +','+ long +'&z=19&layer=c&cbll='+ lat +','+ long +'&cbp=12,3.15,,0,0';
//&sll=37.0625,-95.677068&sspn=52.947994,63.105469&spn=0.001445,0.001926&panoid=nVYUG1RugUUvAifqBwwXrw
	$('#button-street-view').attr('href',url).attr('target','_blank');
	};*/	
	function selectLocation(index){
		//event handler for locations menu items, simulates marker click
		var marker = location_markers[index];
		markerClickHandler(marker);
		setMenuActive(index);

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

	function toggleParking(){
		
		//show/hide parking icons, change button text

		for (var i = 0; i < total_parking; i++) {
			
			var tmp_marker = parking_markers[i];
			
			if (!parking_visible){
				if (tmp_marker.category == "parking") {
					tmp_marker.setVisible(true);
				}
			} else {
				if (tmp_marker.category == "parking") {
					tmp_marker.setVisible(false);
				}
			}
		}
		
		if (!parking_visible){
			parking_visible = true;
			$("#"+settings.button_parking_id+" span").html("Hide Parking");
		} else {
			parking_visible = false;
			$("#"+settings.button_parking_id+" span").html("Show Parking");
		}
		return false;
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
		if (active_menu_page >= total_menu_pages) active_menu_page--;
		menuPaginate();
		return false;
	};
	
	function menuPrevious(){
		active_menu_page--;
		if (active_menu_page < 0) active_menu_page++;
		menuPaginate();
		return false;
	};
	function menuPaginate(){
	
		lower_bound = active_menu_page * settings.visible_menu_items;
		upper_bound = lower_bound + settings.visible_menu_items;

		if (upper_bound > total_locations){
			upper_bound = total_locations;	
		}
		setMenuInactive();
		
		//update menu controls text
		str_text = (lower_bound +1)+"-"+(upper_bound)+" of "+(total_locations)+" Locations";
		$("#"+settings.locations_menu_controls_id+" span").html(str_text);

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
				if (tmp_marker){ tmp_marker.setVisible(true); } // set to 'false' to hide not yet listed markers
			}		
				
		});
		//try { console.log("!menuPaginate  "+active_location_markers.length+'/'+location_markers.length+"/"+ total_locations +"         l:"+ lower_bound +" u:"+ upper_bound +" activepage:"+active_menu_page) } catch(e){}

		//activate/deactivate controls if on first or last page
		if (lower_bound == 0){
			$("#"+settings.locations_menu_controls_id+" a#control-previous").removeClass().addClass('off');
		} else {
			$("#"+settings.locations_menu_controls_id+" a#control-previous").removeClass('off');	
		}
		if (upper_bound == total_locations){
			$("#"+settings.locations_menu_controls_id+" a#control-next").removeClass().addClass('off');
		} else {
			$("#"+settings.locations_menu_controls_id+" a#control-next").removeClass('off');
		}
		//if infobox exists, remove it
		if (document.getElementById("infobox")){														
			infobox.remove();
		}
		//reset bounds
		var bounds = new google.maps.LatLngBounds();
		for (var i = 0; i < location_markers.length; i++){
			bounds.extend(location_markers[i].position);
		}
		if(active_location_markers.length>1){
			map.fitBounds(bounds);//this makes it zoom in too far, if there's only one marker
		}
		//center on active marker
		var top_marker = location_markers[lower_bound];
		//map.setZoom(settings.initial_zoom);
		//var new_center = new google.maps.LatLng( top_marker.lat, top_marker.long );
		//map.panTo(new_center, 10)
		return false;
	};
	$.expr[':'].icontains = function(obj, index, meta, stack){
		return (obj.textContent || obj.innerText || jQuery(obj).text() || '')
			.toLowerCase()
			.indexOf(meta[3].toLowerCase()) >= 0;
	};
})(jQuery);