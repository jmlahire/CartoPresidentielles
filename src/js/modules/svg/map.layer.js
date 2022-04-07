import * as d3Selection from 'd3-selection'
import * as d3Dispatch from 'd3-dispatch'
import * as d3Fetch from 'd3-fetch'
import * as d3Geo from 'd3-geo'
import * as d3Transition from 'd3-transition'
import * as topojson from 'topojson-client'
import {SvgComponent} from './component.js'
import {svgMapRegister} from './map.register'

const d3=Object.assign({},d3Selection,d3Geo,d3Dispatch,d3Fetch,d3Transition);




class MapLayer extends SvgComponent {

    static type = '_Layer';
    static defaultOptions= { autofit:false, valuesKey:'extra', blank:'#fff', clickable:true };

    constructor(id, options={}){
        super(id);
        if (svgMapRegister.has(id)) return svgMapRegister.get(id);
        else {
            this.options = { ...MapLayer.defaultOptions, ...options };
            Object.assign(this.state, { rendered:false });
            this.container=d3.create('svg:g')
                .attr('id',this.id)
                .classed(MapLayer.type,true)
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

    /**
     * Génère une id sous forme _ID à partir d'une ligne de données Geojson
     * @param {Object} d    : données feature attachées au path
     */
    _getId(d){
        try {
            return `_${d.properties[this.options.primary]}`;
        }
        catch (error){
            return null;
        }
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
            if (this.options.autofit) this.fit();
            this.path.projection(this.projection);
            this.container
                .selectAll("path")
                .data(this.geodata)
                .enter()
                .append('path')
                    .attr('class', d => this._getId(d) )
                    .classed('area',true)
                    .classed('clickable',this.options.clickable)
                    .attr('d', this.path)
                    .on('click', (e,d) => (this.options.clickable)? this.dispatch.call('click',this, { event:e, values:d.properties, id:d.properties[this.options.primary]}) : null );
          //  if (this.options.zoomable) this.parentComponent.zoomable(true);
            this.state.rendered=true;
            resolve(this);
        }))
        return this;
    }

    clickable(bool=true){
        this.options.clickable=bool;
        const paths=this.container.selectAll('path.area');
        if (bool)
            paths.classed('clickable',true)
                    .on('click', (e,d) => this.dispatch.call('click',this, { event:e, values:d.properties, id:d.properties[this.options.primary]}));
        else
            paths.classed('clickable',false)
                    .on('click',null);
        return this;
    }


    /**
     * Limite le zoom et le déplacement au contenu du calque
     * @returns {MapLayer}
     */
    fit(){
        this.projection.fitExtent( [[0,0], [this.parentComponent.size.effectiveWidth, this.parentComponent.size.effectiveHeight]],
                                    {type:"FeatureCollection", features: this.geodata}  );
        return this;
    }

    /**
     * Zoome toutes les couches sur tout ou l'ensemble des polygones. Si vide, zoome sur l'ensemble des polygones
     */
    zoomOn(geoId){
        //this.parentComponent.zoomTo(this.container.selectAll('path.area'));
        if (geoId!==undefined) this.parentComponent.zoomTo(this.container.selectAll(`path.area._${geoId}`));
        else this.parentComponent.zoomTo(d3.select(`path.${this.id}`));
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


    join(dataCollection, dataKey='id', geoKey){
        geoKey = geoKey || this.options.primary;
        this.enqueue( () => new Promise((resolve, reject) => {
            dataCollection.ready.then( (data)=> {
                data=data.exportToMap(dataKey);
                this.container.selectAll("path")
                    .each( (d,i,n) => {
                        const   elt = d3.select(n[i]),
                                id = d.properties[geoKey],
                                datum = data.get(id);
                        d.properties[this.options.valuesKey]=(Array.isArray((datum)))?datum[0]:undefined;
                    });
                resolve(this);
            });
        }));
        return this;
    }

    exportProperties(){

        this.container.selectAll('path.area')
            .each(d=>console.log(d));
        return this;
    }


    /**
     * Dessine une carte chloroplethe
     * @param colorFn {Function} : fonction convertissant la valeur en couleur
     * @param accessorFn {Function} : accesseur permettant d'accéder à la propriété qui contient les valeurs (à partir de d.properties) Ex: d=>d.properties.myvalue
     * @returns {MapLayer}
     */
    fill(colorFn, accessorFn ){
        this.enqueue( () => new Promise((resolve, reject) => {
            this.container.selectAll("path.area")
                .each( (d,i,n) => {
                    let data,color,elt = d3.select(n[i]);
                    try {
                        data=accessorFn(d);

                        color=colorFn(data);
                      //  console.log(data,color,colorFn.domain());
                    }catch(error){
                        data=null;
                        color=this.options.blank || '#fff';
                    }
                    if (data && this.options.clickable) {
                        elt.style('fill', color)
                            .classed('clickable',true)
                            .on('click', (e,d)=>{
                                this.select(d)
                                    .dispatch.call('click',this, { event:e, values:d.properties, id:d.properties[this.options.primary] });
                            })
                    }
                    else {
                        elt
                            .style('fill', this.options.blank)
                            .classed('clickable',false)
                            .on('click', null)
                    }
                });
            resolve(this);
        }));
        return this;
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

    /**
     * Applique la classe selected à un path
     * @param {Object} d            Données brutes correspondant au path sélectionné (contient d.properties)
     * @param {Boolean} exclusive   Si true, déselectionne les autres entités de même niveau
     */
    select(d,exclusive=true){
        this.container.selectAll(`path.${this._getId(d)}`).classed('selected',true);
        if (exclusive) this.container.selectAll(`path.area:not(.${this._getId(d)})`).classed('selected',false);
        return this;
    }

    /**
     * Retire la classe selected à un path
     * @param {Object} d            Données brutes correspondant au territoire à desélectionner (contient d.properties)
     */
    deselect(d){
        this.container.selectAll(`path.${this._getId(d)}`).classed('selected',true);
        return this;
    }


    /**
     * Retire la classe selected à tous les paths
     * @returns {MapLayer}
     */
    deselectAll(){
        this.container.selectAll('path.area.selected').classed('selected',false);
        return this;
    }






}
export {MapLayer}