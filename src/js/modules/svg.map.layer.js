import * as d3Selection from 'd3-selection'
import * as d3Dispatch from 'd3-dispatch'
import * as d3Fetch from 'd3-fetch'
import * as d3Geo from 'd3-geo'
import * as topojson from 'topojson-client'
import {SvgComponent} from './svg.component.js'
import {svgMapRegister} from './svg.map.register'

const d3=Object.assign({},d3Selection,d3Geo,d3Dispatch,d3Fetch);




class SvgMapLayer extends SvgComponent {

    static type = 'SvgMapLayer';
    static options= { zoomable: true, autofit:false, valuesKey:'values', blank:'#fff', clickable:true };

    constructor(id, options={}){
        super(id);
        if (svgMapRegister.has(id)) return svgMapRegister.get(id);
        else {
            this.options = { ...SvgMapLayer.options, ...options };
            Object.assign(this.state, { rendered:false });
            this.container=d3.create('svg:g')
                .attr('id',this.id)
                .classed('layer',true)
                .classed(options.className,options.className);
            svgMapRegister.add(id,this);
            this.dispatch=d3.dispatch("click");
        }

    }

    get path(){
        return this.parentComponent.path || d3.geoMercator();
    }

    get projection(){
        return this.parentComponent.projection || d3.geoPath();
    }


    load(file){
        this.enqueue( () => new Promise((resolve, reject) => {
            d3.json(file)
                .then( (topology) => {
                    this.geodata = topojson.feature(topology, Object.getOwnPropertyNames(topology.objects)[0]).features;
                    resolve(this.geodata);
                })
        }));
        return this;
    }

    render(){
        this.enqueue( () => new Promise((resolve, reject) => {
            if (this.options.autofit)
                this.projection.fitExtent([[0,0], [this.parentComponent.size.effectiveWidth, this.parentComponent.size.effectiveHeight]], {type:"FeatureCollection", features: this.geodata});
            this.path.projection(this.projection);

            const   classPrefix = (this.options.primary) ? this.options.primary.charAt(0).toUpperCase() : 'I',
                    classGenerator = (d) => (this.options.primary) ? classPrefix+d.properties[this.options.primary] : '';

            const paths = this.container
                .selectAll("path")
                .data(this.geodata)
                .enter()
                .append('path')
                .attr('class', classGenerator )
                .classed('area',true)
                .attr('d', this.path);
            if (this.options.clickable)
                paths.classed('clickable',true)
                        .on('click', (e,d) => this.dispatch.call('click',this, { event:e, values:d.properties, id:d.properties[this.options.primary]}));
            else
                paths.classed('clickable',false).on('click',null)

            if (this.options.zoomable) this.parentComponent.zoomable(true);
            this.state.rendered=true;
            resolve(this);
        }))
        return this;
    }

    zoom(){
        this.parentComponent.zoomTo(d3.select(`path.${this.id}`));
        return this;
    }
    data(dataCollection, key){
        this.enqueue( () => new Promise((resolve, reject) => {
                dataCollection.ready.then((dc) => {
                    this.dataset = dc;
                    resolve(this.dataset);
                })
        }));

        return this;
    }


    merge(dataCollection, dataKey='insee', geoKey){
        geoKey = geoKey || this.options.primary;
        this.enqueue( () => new Promise((resolve, reject) => {
            dataCollection.ready.then( (data)=> {
                data=data.exportToMap(dataKey);
                this.container.selectAll("path")
                    .each( (d,i,n) => {
                        const   elt = d3.select(n[i]),
                                id = d.properties[geoKey],
                                datum = data.get(id);
                        d.properties[this.options.valuesKey]=datum;
                    });
                resolve(this);
            });
        }));
        return this;
    }

    fill(colorFn){
        this.enqueue( () => new Promise((resolve, reject) => {
            this.container.selectAll("path")
                .each( (d,i,n) => {
                    const elt = d3.select(n[i]),
                          color = colorFn(d,this);
                    if (color && this.options.clickable) {
                        elt.style('fill', color)
                            .style('stroke', color)
                            .classed('clickable',true)
                            .on('click', (e,d)=>{
                                this.container.selectAll('path.area').classed('selected',false);
                                d3.select(e.target).classed('selected',true);
                                this.dispatch.call('click',this, { event:e, values:d.properties, id:d.properties[this.options.primary] });
                            })
                    }
                    else {
                        elt.style('fill', this.options.blank)
                            .classed('clickable',false)
                            .on('click', null)
                    }

                    //console.log(d)
                });
            resolve(this);
        }));
        return this;
    }

    addGradient(values,options){
       return this.parentComponent.addGradient(values,options);
    }

    labels(dataCollection,dataKey,labelKey, options){
        options={...{ delay:1500, duration:1000},...options };
        this.enqueue( () => new Promise((resolve, reject) => {
            dataCollection.ready.then( (data)=> {
                const list=data.exportToMap(dataKey);
                this.labelContainer=this.innerContainer.append('g').attr('class','labels');
                this.container.selectAll('path.area')
                    .each((d) => {
                        const pref=list.get(d.properties[this.options.primary]);
                        if (pref) {
                            const center=this.path.centroid(d);
                            this.labelContainer.append('text')
                                .attr('class','label')
                                .attr('x',center[0])
                                .attr('y',center[1])
                                .transition()
                                .delay(options.delay)

                                .duration(options.duration)

                                .attr('font-size',24)
                                .text(pref[0][labelKey])
                                .on('end', ()=> resolve(this));

                        }
                    });
            })


        }));
        return this;
    }






}
export {SvgMapLayer}