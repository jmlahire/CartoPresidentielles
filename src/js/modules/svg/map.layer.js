import * as d3Selection from 'd3-selection'
import * as d3Dispatch from 'd3-dispatch'
import * as d3Fetch from 'd3-fetch'
import * as d3Geo from 'd3-geo'
import * as d3Transition from 'd3-transition'
import * as d3Array from 'd3-array'
import * as d3Scale from 'd3-scale'
import * as d3Interpolate from 'd3-interpolate'
import * as topojson from 'topojson-client'
import {SvgComponent} from './component.js'
import {svgMapRegister} from './map.register'

const d3=Object.assign({},d3Selection,d3Geo,d3Dispatch,d3Fetch,d3Transition,d3Array,d3Scale,d3Interpolate);




class MapLayer extends SvgComponent {

    static type = '_Layer';
    static defaultOptions= { autofit:false, blank:'#eee', clickable:true };

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
        this.ready=new Promise((resolve, reject) => {
                d3.json(file)
                    .then( (topology) => {
                        this.geodata = topojson.feature(topology, Object.getOwnPropertyNames(topology.objects)[0]).features;
                        resolve(this.geodata);
                    })
            });
        this.enqueue( () => this.ready );
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


    /**
     * Fusionne un jeu de données à la couche (les données ajoutées seront ajoutées à d.properties)
     * @param {DataCollection} dataCollection       Données (instance de DataCollection)
     * @param {String} [dataKey]                    Clé primaire des données supplémentaires utilisée pour l'association. Si vide, la méthode essaiera de chercher la clé primaire de dataCollection
     * @param {String} [geoKey]                      Clé primaire des données de la couche utilisée pour l'association. Si vide, la méthode utiliser la clé primaire de la couche
     * @returns {MapLayer}
     */
    join(dataCollection, dataKey, geoKey){
        geoKey = geoKey || this.options.primary;
        dataKey = dataKey || dataCollection.primary;
        this.enqueue( () => new Promise((resolve, reject) => {
            dataCollection.ready.then( (data)=> {
                data=data.exportToMap(dataKey);
                this.container.selectAll("path")
                    .each( (d) => {
                        const   id = d.properties[geoKey],
                                datum = data.get(id);
                        if (Array.isArray((datum))) {
                            Object.assign(d.properties,datum[0]);
                        }
                    });
                resolve(this);
            });
        }));
        return this;
    }

    /**
     * Calcule les domaines (et les moyennes et médianes) des données contenues dans d.properties: ils seront disponibles dans this.metadata
     * @param {Array|String} keys           Clés des données dont il faut calculer les statistiques
     * @param {Array} [type]                Statistiques à calculer parmi les suivantes: domain, sum, count, median, deviation
     */
    statistics(keys, types=['domain','mean']){
        const   calcRound = (v) => Math.round(v*10000)/10000;
        const   calcFunction= {
            domain:d3.extent,
            sum:d3.sum,
            count:d3.count,
            mean: (v) => calcRound(d3.mean(v)),
            median: (v) => calcRound(d3.median(v)),
            deviation: (v) => calcRound(d3.deviation(v,.1))
        }
        this.enqueue( () => new Promise((resolve, reject) => {
            this.metadata = this.metadata || {};
            if (typeof keys === 'string') keys = [keys];
            types.forEach( prop => this.metadata[prop]= this.metadata[prop] || {} );
            types=types.reduce((a, v) => ({ ...a, [v]: true}), {});
            Object.keys(calcFunction)
                .forEach( (t) => {
                    keys.forEach((k) => {
                            let data = this.geodata.map(d => d.properties[k]);
                            if (types[t]) this.metadata[t][k]=calcFunction[t](data);
                    })
            });
            resolve(this);
        }));
        return this;

    }


    /**
     * Crée une carte chloroplethe
     * @param {String}      key                     Clé des données à utiliser (dans d.properties)
     * @param {Object}      [options]               Options
     * @param {String}      [options.colors]        Couleur à utiliser (si 2 échelle linéaire, si 3 échelle divergente)
     * @param {Array}       [options.domain]        Focce le domain (sinon utilise le domaine courant)
     * @returns {MapLayer}
     */
    fill(key, options={ } ){
        options={...{ colors:['#fff','#000'],clamp:true },...options};
        this.statistics(key,['domain','mean']);
        this.enqueue( () => new Promise((resolve, reject) => {
            //Assignation du domaine s'il n'est pas fourni
            if (!options.domain)  {
                //Par défaut, domaine de type [min,max]
              //  if (!this.metadata.domain[key]) this.statistics(key,['domain']);
                options.domain=this.metadata.domain[key];
                //Si 3 couleurs en paramètre, échelle divergente -> on insère la moyenne dans le domaine [min,mean,max]
                if (options.colors.length===3) {
                //    if (!this.metadata.mean[key]) this.statistics(key,['mean']);
                    options.domain=[options.domain[0],this.metadata.mean[key],options.domain[1]];
                }
            }
            //Coloriage
            const palette=this._fillPalette(options);
            this.container.selectAll("path.area")
                .each( (d,i,n) => {
                    let data,color,elt = d3.select(n[i]);
                    try {
                        data=d.properties[key];
                        //console.log(data);
                        color=palette(data);
                      //  console.log(data,color,colorFn.domain());
                    }catch(error){
                        data=null;
                      // console.warn(error,d,n[i]);
                        color=this.options.blank || '#000';
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

    _fillPalette(options){
            return d3.scaleLinear()
                .range(options.colors)
                .domain(options.domain)
                .interpolate(d3.interpolateLab)
                .clamp(options.clamp);
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