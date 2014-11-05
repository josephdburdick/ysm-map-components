/*

Yale School of Medicine
Google Maps component
by Jon Krauss, jonkrauss.com


_What it does:

Adds search/filter functionality to YSM gmap_locations.js Google map component.


*/

(function($) {

	//declare and set some variables
	var el;
	var $el;
	var element;
	var gmap_obj;
	//var parking;
	//var locations;
	//var search_settings;


	//constructor
	$.gmap_search = function(element, settings) {
		
		this.search_settings = {};
		
//try{ console.log('gmap_search '+$(element).attr('id')); } catch(e){}
		
		$(element).data('gmap_search', this);
		
		//el = this;
		//$el = $(el);
		
		var id = $(element).attr('id');
		
		el = $('#'+id);
		
		init(element, settings);

	};

	//return instance
	$.fn.gmap_search = function(settings) {    
	
//try { console.log('gmap_search ') } catch(e){}
	
		return this.each(function(i) {
			
			(new $.gmap_search( $(this), settings) );              
		});        
	};
	
	//default options
	$.gmap_search.searchDefaultOptions = {
		gmap_id: 'map-search',
		help_text: 'Search map for...',
		text_input_id: 'map-search-keywords',
		button_close_id: 'button-close-results',
		button_submit_id: 'button-submit-map-search',
		totals_id: 'map-search-total'
	}

	
	
	//private methods
	function init(element, settings) {  
try { console.log('gmap_search init '+el['selector']); } catch(e){}
	
		this.search_settings = $.extend({}, $.gmap_search.searchDefaultOptions, settings); 
		this.element = element;
		
		$(el).find('#'+search_settings.text_input_id).val(search_settings.help_text);
		
		//$(el).find('#'+search_settings.totals_id).slideUp(function(){ $(this).hide()}) ;
		
		addSearchEvents();
	};
	
/*	function getLocationsData(){
		
//try { console.log('gmap_search getLocationsData  '+ $('#'+this.search_settings.gmap_id).data('gmap_locations').getLocationsData() ); } catch(e){}
		
		
		var the_data = $('#'+this.search_settings.gmap_id).data('gmap_locations').getLocationsData();
		
		if ( the_data == undefined ){
			try { console.log('	gmap data: undefined'); } catch(e){}
		}
		return the_data;
	};*/
	
	function addSearchEvents(){
		
//try { console.log('!!addSearchEvents '+this.element+' '+this.element['selector'] ); } catch(e){}
		
		//try { console.log('addSearchEvents '+ el.attr('id') ); } catch(e){}

		
/*		for (x in el){
			console.log('!'+x+' '+el[x]);
		}*/
		
		//clear filter
		$(el).find('#'+search_settings.button_close_id).bind('click',function(){ clearFilter(); return false; });
		
		//submit button
		$(el).find('#'+search_settings.button_submit_id).bind('click',function(){ 
			var input = $(el).find('#'+search_settings.text_input_id).val();
			if (input != '' && input != undefined && input != ' ' && input != search_settings.help_text){
				submitHandler(input);
			}
			return false;
		});
		
		//text input enter keypress		
		$(el).find('#'+search_settings.text_input_id).keyup(function(e) {
			//alert(e.keyCode);
			if (e.keyCode == 13) {
				var input = $(el).find('#'+search_settings.text_input_id).val();
				if (input != '' && input != undefined && input != ' ' && input != search_settings.help_text){
					submitHandler(input);
				}
				return false;
			}
		});
		
		//text input focus
		$(el).find('#'+search_settings.text_input_id).focus(function(){
			var $input = $(this);
			$input.select();

			if ($input.val() == search_settings.help_text){
				$input.val('');
			}
		});
		
		//text input blur
		$(el).find('#'+search_settings.text_input_id).blur(function(){
			var $input = $(this);
			if ($input.val() == ''){
				$input.val(search_settings.help_text);
			}
		});
		

		//button_submit: submit form
		//enter in form: submit form
		//button_close: clear filter

	};
	
	function submitHandler(terms){
		
		var total_locations = $('#'+search_settings.gmap_id).data('gmap_locations').addFilter(terms);
//try { console.log('submitHandler ' +total_locations);  } catch(e){}

		displayTotals(terms, total_locations);
		
		
		
		return false;







		
		//get locations data from map		
		var the_locations = $('#'+search_settings.gmap_id).data('gmap_locations').getLocationsData();
		var filtered_locations;
		var total_locations;
		var found = 0;
		
	/*	if ($.browser.msie){
			var xDom = new ActiveXObject("Microsoft.XMLDOM");
			filtered_locations = xDom.loadXML("<locations></locations>");
console.log('ie');
		} else {
			filtered_locations = $("<locations></locations>");
		}*/
				
		//filtered_locations = $('<locations></locations>');
		
		
		//filtered_locations = $(the_locations).clone();//.children().remove();
		//$(filtered_locations).children('location').remove();


		
		
//try { console.log('submitHandler total '+ $(the_locations).find("location").length ); } catch(e){ console.log('submitHandler error with locations.find("location").length' ); }
		
		
		//search through locations for terms
/*		$(the_locations).find('location').children(':not("latitude,longitude,buildingType,buildingCode,locationType"):containsi("'+terms+'")').each(function(i){
*/
		$(the_locations).find('location').each(function(i){
			
			var filter_group = $(this).children(":not('latitude,longitude,buildingType,buildingCode,locationType'):contains('"+terms+"')");
			
try { console.log('+ '+i+' '+filter_group.length );  } catch(e){}
			
			
				
			if ( filter_group.length > 0){
				try {

//console.log( "ok " +filter_group.length);

					$(filtered_locations).append( $(this).clone() );
					
					//$(this).clone(true).appendTo(filtered_locations); 
					
				} catch(e){
console.log('gmap search clone error '+e.description);
				}
				
					found++;
				//$(filtered_locations).append( $(this).parent('location').clone() );
//try { console.log('	i:'+i+'   found:'+found+'   filtered.len:'+$(filtered_locations).length );  } catch(e){}
				
			} else {
//try { console.log('no	'+i );  } catch(e){}
	
			}
		});
		
		total_locations = $(filtered_locations).find('location').length;

		displayTotals(terms, total_locations);	
		
		if (total_locations > 0){
			//send filtered data to gmap_locations
			$('#'+search_settings.gmap_id).data('gmap_locations').setLocationsData(filtered_locations);
		}
		
//try { console.log('= '+total_locations+' '+found+'/'+i ); } catch(e){}


	};
	
	function displayTotals(search_terms, total_locations){

//try { console.log('displayTotals '+search_terms+' '+total_locations); } catch(e){}
		var new_txt;
		if (total_locations == 1){
			locations_text = "Location";
		} else {
			locations_text	= "Locations";
		}
		
		if (total_locations > 0){
			new_txt = 'Search Results for <strong> '+ search_terms +' </strong><br /><span class="small-print">'+ total_locations +' '+ locations_text+'</span>';
		} else {
			new_txt = 'No matches were found for <strong>'+ search_terms +'</strong>';
		}
		
		$('#'+search_settings.totals_id).find('p').html(new_txt);
		
		var totals_height = $('#'+search_settings.totals_id).height();
		
		$('#'+search_settings.totals_id).slideDown('fast');
		
/*		$('#'+search_settings.totals_id).slideDown('fast',function(){
console.log('! '+$(this).height() +' '+ totals_height);
			if ( $(this).height() != totals_height ){
				var new_height = $(this).height() + $('#map-sidebar').height();
				$('#map-sidebar').animate({ height: new_height }, 500);		
			}
		});*/
	};
	
	function clearFilter(){
		
//try { console.log('clearFilter'); } catch(e){}
		
		$(el).find('#'+search_settings.text_input_id).val(search_settings.help_text);
		
		$('#'+search_settings.gmap_id).data('gmap_locations').clearFilter();

		$('#'+search_settings.totals_id).slideUp('fast');

		/*var open_height = $('#'+search_settings.totals_id).height();
		$('#'+search_settings.totals_id).slideUp('fast',function(){
			var new_height = $('#map-sidebar').height() - open_height;
			$('#map-sidebar').animate({ height: new_height }, 500);
		});*/
	};
	
/*	$.expr[':'].icontains = function(obj, index, meta, stack){
		return (obj.textContent || obj.innerText || jQuery(obj).text() || '').toLowerCase().indexOf(meta[3].toLowerCase()) >= 0;
	};*/
	
	//case insensitive search pseudoclass
$.expr[":"].containsi = function(obj, index, meta, stack){
return (obj.textContent || obj.innerText || $(obj).text() || "").toLowerCase() == meta[3].toLowerCase();
}
	
//doesn't work in ie
/*	$.extend($.expr[":"], {
	    "containsi": function(elem, i, match, array) {
		   return (elem.textContent || elem.innerText || "").toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
	    }
	});*/

	
/*$.extend($.expr[':'], {
	'icontains': function(elem, i, match, array){
		return (elem.textContent || elem.innerText || '').toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
	}
});*/

	
})(jQuery);