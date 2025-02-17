// Add year as a global variable at the top of the file
const year = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        console.log('Received data:', data.slice(0, 3)); // Log first few entries
        createHeatmap(data);
        createProgressChart(data);
    } catch (error) {
        console.error('Error:', error);
    }
}

function createHeatmap(data) {
    // Set dimensions
    const width = 960;
    const height = 136;
    const cellSize = 17;

    // Create SVG
    const svg = d3.select("#calendar-heatmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(40, 20)`);

    // Log the data we're working with
    console.log('Creating heatmap with data:', data.slice(0, 3));

    // Create color scale
    const colorScale = d3.scaleQuantile()
        .domain([0, d3.max(data, d => d.value) || 1])
        .range([
            "#e5f5e0",  // Lightest green
            "#a1d99b",  // Light green
            "#31a354",  // Medium green
            "#004225",  // British Racing Green
            "#00260f"   // Darkest green
        ]);

    // Create tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Format data - ensure dates are in YYYY-MM-DD format
    const dateValues = d3.group(data, d => {
        const date = new Date(d.date);
        return d3.timeFormat("%Y-%m-%d")(date);
    });

    // Create day cells
    const rect = svg.selectAll(".day")
        .data(d3.timeDays(new Date(year, 0, 1), new Date(year + 1, 0, 1)))
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("width", cellSize - 1)
        .attr("height", cellSize - 1)
        .attr("x", d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize)
        .attr("y", d => d.getDay() * cellSize)
        .datum(d3.timeFormat("%Y-%m-%d"));

    // Color the cells based on data
    rect.filter(d => dateValues.has(d))
        .style("fill", d => colorScale(dateValues.get(d)[0].value))
        .on("mouseover", function(event, d) {
            const value = dateValues.get(d)[0].value;
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Date: ${d}<br/>Value: ${value}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Add month labels
    svg.selectAll(".month")
        .data(d3.timeMonths(new Date(year, 0, 1), new Date(year + 1, 0, 1)))
        .enter()
        .append("text")
        .attr("class", "month-label")
        .attr("x", d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize)
        .attr("y", -5)
        .text(d => d3.timeFormat("%B")(d));

    // Create legend
    const legendWidth = 200;
    const legendHeight = 20;
    
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(40, ${height + 20})`);

    const legendScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d => d.toFixed(1) + " miles");

    legend.append("g")
        .call(legendAxis);

    // Create gradient for legend
    const gradient = legend.append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    gradient.selectAll("stop")
        .data(colorScale.range())
        .enter()
        .append("stop")
        .attr("offset", (d, i) => i / (colorScale.range().length - 1))
        .attr("stop-color", d => d);

    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)")
        .attr("transform", `translate(0, -${legendHeight})`);
}

function createProgressChart(data) {
    // Calculate total mileage and goal pace
    const totalMiles = data.reduce((sum, d) => sum + d.value, 0);
    const today = new Date();
    const startDate = new Date(year, 0, 1);
    const elapsedDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const targetMiles = (elapsedDays / 365) * 1000;
    
    // Set up dimensions
    const margin = { top: 30, right: 20, bottom: 50, left: 20 };
    const width = 960 - margin.left - margin.right;
    const height = 40;  // Reduced height for the bar

    // Create SVG
    const svg = d3.select("#progress-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    // Add title
    svg.append("text")
        .attr("x", margin.left)
        .attr("y", margin.top - 10)
        .attr("class", "progress-title")
        .text("Progress Bar");

    // Create progress bar background
    svg.append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", width)
        .attr("height", height)
        .attr("class", "progress-bar-bg");

    // Create progress bar
    svg.append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", (totalMiles / 1000) * width)
        .attr("height", height)
        .attr("class", "progress-bar");

    // Add goal pace marker
    svg.append("line")
        .attr("x1", margin.left + (targetMiles / 1000) * width)
        .attr("x2", margin.left + (targetMiles / 1000) * width)
        .attr("y1", margin.top - 5)
        .attr("y2", margin.top + height + 5)
        .attr("class", "goal-pace-line");

    // Add total mileage and goal pace text
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.top + 30)
        .attr("class", "progress-stats")
        .attr("text-anchor", "middle")
        .text(`Total Mileage: ${totalMiles.toFixed(2)} miles | Goal Pace: ${targetMiles.toFixed(2)} miles`);
} 