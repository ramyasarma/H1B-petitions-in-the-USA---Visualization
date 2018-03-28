// Read csv containing H1B petitions filed by state
d3.csv("visastate.csv", function(err, data) {

// Initial values for visualization  
var config = {"color1":"#d3e5ff","color2":"#08306B","stateDataColumn":"state","defaultValue":"2017","state":"state"};
// Margins for the SVG element  
var WIDTH = 960, HEIGHT = 500;
var SCALE = 0.1;
// Setting options for the drop down menu
var fields = Object.keys(data[0]);
   const margin = { top: 30, right:20, bottom: 10, left: 70 }; 
  var option_select = d3.select('#selectors').append("select")
      .attr("class", "option-select");
  for (var i = 0; i < fields.length; i++) {
    if (fields[i] !== config.state) {
      var opt = option_select.append("option")
        .attr("value", fields[i])
        .text(fields[i]);
      
      if (fields[i] === config.defaultValue) {
        opt.attr("selected", "true");
      }
    }
  }

//Setting the height and width of the map
var width = WIDTH,
      height = HEIGHT,
      active = d3.select(null);
//Setting up color scale
var lowColor = '#cce6ff';
var highColor = '#004080';
var quantize= d3.scaleLinear().domain([0,1.0]).range([lowColor,highColor]);
  
// D3 Projection
var projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2]) // translate to center of screen
    .scale([1000]); // scale things down so see entire US

// Define path generator
  var path = d3.geoPath() // path generator that will convert GeoJSON to SVG paths
  .projection(projection); // tell path generator to use albersUsa projection
  var zoom = d3.zoom()
    // no longer in d3 v4 - zoom initialises with zoomIdentity, so it's already at origin
    // .translate([0, 0]) 
    // .scale(1) 
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

 var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", stopped, true); 

// Implement the bounding box
svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", reset);

var g = svg.append("g");

svg.call(zoom); // delete this line to disable free zooming
    // .call(zoom.event); // not in d3 v4

// Append Div for tooltip to SVG
var div = d3.select("body")
        .append("div")   
        .attr("class", "tooltip")               
        .style("opacity", 0);

// Reading file containg state and lat and long information  
d3.tsv("us-state-names.tsv", function(error, names) {
  d3.json("us.json", function(error, us) {
    // Store information from the tsv
    var name_id_map = {};
    var id_name_map = {};
    
    for (var i = 0; i < names.length; i++) {
      name_id_map[names[i].name] = names[i].id;
      id_name_map[names[i].id] = names[i].name;
    }
    
    var dataMap = {};
    
    data.forEach(function(d) {
      if (!dataMap[d[config.state]]) {
        dataMap[d[config.state]] = {};
      }
      
      for (var i = 0; i < Object.keys(data[0]).length; i++) {
        if (Object.keys(data[0])[i] !== config.state) {
          dataMap[d[config.state]][Object.keys(data[0])[i]] =
            +d[Object.keys(data[0])[i]];
        }
      }
    });
    // Function to draw the map with state
    function drawMap(dataColumn) {
      var valueById = d3.map();
      
      data.forEach(function(d) {
        var id = name_id_map[d[config.state]];
        valueById.set(id, +d[dataColumn]); 
      });
    // Get the domain from the data set  for setting up the color scale
    quantize.domain([d3.min(data, function(d){ return +d[dataColumn] }),
    d3.max(data, function(d){ return +d[dataColumn] })]);
    
    // Draw the states
    g.selectAll("path")
          .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
         .attr("class", "feature")
         // .attr("transform", "scale(" + SCALE + ")")
         // .on("click", clicked)
          .style("fill", function(d) {
            return quantize(valueById.get(d.id)); // fill color based on number of petitions filed
          }
          )
          .attr("d", path)
          .on("mousemove", function(d) { // tooltip
              var html = "";
    
              html += "<div class=\"tooltip_kv\">";
              html += "<span class=\"tooltip_key\">";
              html += id_name_map[d.id];
              html += "</span>";
              html += "</div>";
              
              for (var i = 0; i < Object.keys(data[0]).length -1 ; i++) {
                html += "<div class=\"tooltip_kv\">";
                html += "<span class='tooltip_key'>";
                html += Object.keys(data[0])[i];
                html += "</span>";
                html += "<span class=\"tooltip_value\">";
                html += (dataMap[id_name_map[d.id]][Object.keys(data[0])[i]]);
                html +=  "";
                html += "</span>";
                html += "</div>";
              }
              
              $("#tooltip-container").html(html);
              $(this).attr("fill-opacity", "0.7");
              $("#tooltip-container").show();
              
              var coordinates = d3.mouse(this);
              
              var map_width = $('.feature')[0].getBoundingClientRect().width;
              
              if (d3.event.layerX < map_width / 2) {
                d3.select("#tooltip-container")
                  .style("top", (d3.event.layerY + 15) + "px")
                  .style("left", (d3.event.layerX + 15) + "px");
              } else {
                var tooltip_width = $("#tooltip-container").width();
                d3.select("#tooltip-container")
                  .style("top", (d3.event.layerY + 15) + "px")
                  .style("left", (d3.event.layerX - tooltip_width - 30) + "px");
              }
          })
          .on("mouseout", function() {
                  $(this).attr("fill-opacity", "1.0");
                  $("#tooltip-container").hide();
              });
    // draw the states mesh
      g.append("path")
          .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
          .attr("class", "mesh")
         // .attr("transform", "scale(" + SCALE + ")")
          .attr("d", path);
    }
    // initialise visualization with initial configuration
    drawMap(config.defaultValue);
    // on changing the value in the drop down menu
    option_select.on("change", function() {
      drawMap($("#selectors").find(".option-select").val());
    });
   
  });
  });
  function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  svg.transition()
      .duration(750)
      // .call(zoom.translate(translate).scale(scale).event); // not in d3 v4
      .call( zoom.transform, d3.zoomIdentity.translate(translate[0],translate[1]).scale(scale) ); // updated for d3 v4
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  svg.transition()
      .duration(750)
      // .call( zoom.transform, d3.zoomIdentity.translate(0, 0).scale(1) ); // not in d3 v4
      .call( zoom.transform, d3.zoomIdentity ); // updated for d3 v4

}

function zoomed() {
  g.style("stroke-width", 1.5 / d3.event.transform.k + "px");
  // g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"); // not in d3 v4
  g.attr("transform", d3.event.transform); // updated for d3 v4
}

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
function stopped() {
  if (d3.event.defaultPrevented) d3.event.stopPropagation();
}


// Map the cities I have lived in!
d3.csv("topcity.csv", function(data) {
  data.forEach(function(d){
       
       d.Total = +d.Total;
       d.Salary = +d.Salary;
       d.lat = +d.lat;
       d.long = +d.long;
    });
//console.log(data);
var circles = d3.select("svg")
  .append("g")
  .attr("class", "circles")
  .selectAll("circle")
  .data(data)
  .enter()
  .append("circle")
  .attr("cx", function(d) {
    console.log(d.long);
    return projection([d.long, d.lat])[0];
  })
  .attr("cy", function(d) {
    return projection([d.long, d.lat])[1];
  })
  .attr("r", function(d) {
    return Math.sqrt(d.Total) * 0.05;
  })
    .style("fill", "rgb(217,91,67)")  
    .style("opacity", 0.85) 

  // Modification of custom tooltip code provided by Malcolm Maclean, "D3 Tips and Tricks" 
  // http://www.d3noob.org/2013/01/ding-tooltips-to-d3js-graph.html
  .on("mouseover", function(d) {      
      div.transition()        
           .duration(200)      
           .style("opacity", .9);      
           div.text("City Name:" + d.City + "\n Average Salary:" + d.Salary + "$" + "\n Total cases:" + d.Total)
           .style("left", (d3.event.pageX) + "px")     
           .style("top", (d3.event.pageY - 28) + "px");    
  })   

    // fade out tooltip on mouse out               
    .on("mouseout", function(d) {       
        div.transition()        
           .duration(500)      
           .style("opacity", 0);   
    });




//create drag handler with d3.drag()
var drag_handler = d3.drag()
    .on("start", drag_start);
  //  .on("drag", drag_drag);

function drag_start(){
    // get starting location of the drag 
    // used to offset the circle 
     start_x = +d3.event.x;
     start_y = +d3.event.y;
}    
    
function drag_drag(d) {
    //Get the current scale of the circle 
    //case where we haven't scaled the circle yet
    if (this.getAttribute("transform") === null)
    {
        current_scale = 1; 
    } 
    //case where we have transformed the circle 
    else {
        current_scale_string = this.getAttribute("transform").split(' ')[1];
        current_scale = +current_scale_string.substring(6,current_scale_string.length-1);
    }
      d3.select(this)
        .attr("cx", d.x = start_x + ((d3.event.x - start_x) / current_scale) )
        .attr("cy", d.y = start_y + ((d3.event.y - start_y) / current_scale));
}
             
//apply the drag_handler to our circles 
drag_handler(circles);    
 
/* 
 * ZOOM BEHAVIOUR         
 */       
      
//create zoom handler 
var zoom_handler = d3.zoom()
    .on("zoom", zoom_actions);

    
//specify what to do when zoom event listener is triggered 
function zoom_actions(){
  circles.attr("transform", d3.event.transform);
  zoomed();
}

//add zoom behaviour to the svg element backing our graph.  
//same thing as svg.call(zoom_handler); 
zoom_handler(svg);

});

});