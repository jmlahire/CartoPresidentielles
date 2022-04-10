import '../style/main.scss'
import '../style/custom.scss'
import '../style/dev.scss'

import {DataCollection} from "./modules/data/datacollection";
import {Title} from "./modules/html/content.text";
import {NavBreadcrumb} from "./modules/html/nav.breadcrumb";
import {NavButtons} from "./modules/html/nav.buttons";
import {ContentBox} from "./modules/html/content.box";
import {Panel} from "./modules/html/panel.js";
import {MapComposition} from './modules/svg/map.composition';
import {MapLayer} from './modules/svg/map.layer';


import * as d3Array from 'd3-array'
import * as d3Scale from 'd3-scale'
const d3=Object.assign({},d3Array,d3Scale);


/************************************** GLOBAL *******************************************/

/**
 * Proxy permettant de modifier la carte en modifiant ses propriétés
 * Valeurs possibles
 *      candidat: numero du candidat
 *      departement: identifiant du département (0 pour France entière)
 *      palette: linear ou diverging
 */
const global = new Proxy( { candidat:1, departement:0, palette:'linear' } , {
    get: (target, prop, receiver)=> {
        return target[prop];
    },
    set: (target, prop, value, receiver) => {

        appPanel.fold({delay:200});
        //Modification candidat
        if (prop==='candidat') {
            target.candidatData = dataCandidats.find(value);
            if (target.candidatData) {
                target[prop]=value;
                updateTitle();
                updateMaps();
            }
        }
        //Changement département (0 = France entière)
        else if (prop==='departement'){
            target[prop]=value;
            zoomToDept(value);
        }
        else if (prop==='palette'){
            target[prop]=value;
        }
        return true;
    }
});




/************************************* DONNEES ****************************************/
/**
 * Mapper pour les fichiers de résultats par communes au format csv
 * @param row
 * @returns {*}
 */
function dataMapperCom (row) {
    for (const [key, value] of Object.entries(row)) {
        row[key] = (['dep','insee','nom'].includes(key)) ? row[key] : parseFloat(row[key]);
    }
    return row;
}

/**
 * Mapper pour les fichiers de résultats par departements au format csv
 * @param row
 * @returns {*}
 */
function dataMapperDep (row) {
    for (const [key, value] of Object.entries(row)) {
        if (key.substring(0, 2)==='nb' || key==='tncc' || key==='reg_insee') row[key]=parseInt(row[key]);
        else if (key.substring(0, 4)==='voix' || key==='participation') row[key]=parseFloat(row[key]);
    }
    return row;
}

/**
 * Mapper pour le fichier candidats
 * @param row
 * @returns {*}
 */
function dataMapperCand (row) {
    for (const [key, value] of Object.entries(row)) {
        row[key] = (['id', 'dep_min', 'dep_max', 'dep_moy','dep_med', 'com_min', 'com_max', 'com_moy','com_med','fr_moy'].includes(key)) ? parseFloat(row[key]) : row[key];
    }
    return row;
}



const dataCandidats = new DataCollection('candidats')
    .load('./../assets/data/candidats-test.csv',{ primary: 'id',  delimiter: ';', mapper: dataMapperCand });

const dataDepartements = new DataCollection('resParDept')
    .load('./../assets/data/departements-test.csv',{ primary: 'insee', delimiter: ';', mapper: dataMapperDep });

const dataPrefectures = new DataCollection('prefectures')
    .load('./../assets/geodata/prefectures.csv',{   primary:'COM', mapper: row => row });


//************************************ FONCTIONS ******************************************************

/**
 * Met le titre à jour
 */
function updateTitle () {

    let t,n;
    switch (global.candidat) {
        case 13:
            t = 'Cartographie de l\'';
            n = 'abstention';
            break;
        case 14:
            t = 'Cartographie du ';
            n = 'vote blanc';
            break;
        default:
            t = 'Cartographie du vote ';
            n = global.candidatData.nom;
    }
    appTitle.text('titre',t)
        .text('candidat',n,[`color:${global.candidatData.couleur}`,'font-weight:bold'])
        .render();
}


/**
 * Renvoie le jeu de couleurs pour l'affichage des cartes
 * @param {Int} candidat        numero du candidat
 * @returns {(string|*)[]|string[]}
 */
function paletteColors (candidatData) {
    if (global.palette==='linear') return ['#fff',candidatData.couleur];
    else if (global.palette==='diverging') return ['red','yallow','green'];
}

/**
 * Met à jour les cartes chloroplethes avec les données courantes (global.candidat et global.palette)
 */
function updateMaps (){
    //   console.log(paletteColors(global.candidat));
    mapDepartements.fill ( global.candidatData.key, { colors: paletteColors(global.candidatData)});
    for (const[key,myMap] of Object.entries(mapCommunes)) {
        myMap.fill ( global.candidatData.key,{ colors: paletteColors(global.candidatData)});
    }
}

/**
 * Zoome sur un departement
 * @param insee
 */
function zoomToDept (insee) {
    appBox.hide();

    //Zoom-in: zoom sur un département
    if (insee){
        mapContainer.fadeOutLayers(`.communes:not(._${insee}`);
        appNavigator.getLevel(1).select(insee);
        const candidat = dataCandidats.find(global.candidat);
      //  console.log(appNavigator.level(1));
        //Cas A : Carte et données à charger
        if (!mapCommunes[`_${insee}`]) {

            mapCommunes[`_${insee}`] =  new MapLayer(`_${insee}`,{ primary:'COM', secondary:'NCC', className:'communes' })
                                                .load(`../assets/geomap/${insee}.topojson`);
            const dataCommunes =        new DataCollection(`Résultats_${insee}`)
                                                .load(`../assets/data/${insee}.csv`,{   primary:'insee', delimiter:';', mapper: dataMapperCom });
            dataCommunes.ready.then((v)=>{
                mapCommunes[`_${insee}`].ready.then((geodata)=>{
                    appNavigator.getLevel(2).data(dataCommunes.dataset, {placeHolder: 'Commune', valueKey:'insee', labelKey:'nom'});
                    appNavigator.showLevels(3);
                    mapCommunes[`_${insee}`]
                        .appendTo(mapContainer)
                        .render()
                        .join(dataCommunes)
                        .fill ( candidat.key, { colors: paletteColors(candidat)})
                        // .fill ( colorFactory( candidat.couleur,[candidat.com_min,candidat.com_max]),  d =>  d.properties.extra[candidat.key])
                        .labels(dataPrefectures,'COM','NCCENR');
                    mapCommunes[`_${insee}`].dispatch.on('click',appBox.push );
                })


            })


           // mapContainer.zoomable(true);
         }
        //Cas B : carte et données déjà chargés
        else {
            mapCommunes[`_${insee}`].fadeIn();
          //  mapCommunes[`_${insee}`].dispatch.on('click',appBox.push );
            //mapDepartements.zoomOn(insee);
        }

        mapDepartements.zoomOn(insee);


            /*
            appBox.reset()
                .title(param.values.NCCENR)
                .content(param.values)
               // .table(param.values.values, (d)=> `<td>${d.Prénom} ${d.Nom}</td><td>${d.Mandat}</td><td>${d.Candidat}</td>`)
                .position(param.event)
                .show();*/

    }
    //Zoom-out: retour carte de France
    else {
        appNavigator.showLevels(2);
        mapDepartements.deselectAll();
        mapContainer.fadeOutLayers(`.communes`);
        mapContainer.zoomOut();
    }

}









/************************************** COMPOSANTS *******************************************/


const   appTitle =          new Title('Titre',['titre','candidat']);
const   appNavigator =      new NavBreadcrumb('Navigator');
const   appPanel =          new Panel('candPanel');
const   appSelector =   new NavButtons('boutonsCandidats',{label:'', style:'square'});



const appBox =  new ContentBox('ContentBox');
appBox.push=function(param){
    const values=param.values;
    console.log(dataCandidats.find(1));
    this.reset()
        .title(param.values.NCCENR)

        .text('Participation: '+(100-values.nb_voix13)+'%',{align:'right'});

    const table=this.table()
        .tr([ { v:'Candidat',colspan:2},{v:'Suffrages', align:'right'},{v:'Résultat',align:'right'}],{tag:'th'});
    const order=[];
    for (let i=1;i<=12;i++){
        order.push({i:i,v:values[`nb_voix${i}`]});
    }
    order.sort((a,b)=>a.v>b.v);
    order.forEach(d=> {
        let candidat=dataCandidats.find(d.i);
        table.tr([ {v:candidat.couleur, f:'color'},{ v: candidat.nom},{ v: values[`nb_voix${d.i}`], f:'int'}, { v: values[`voix_${d.i}`], f:'percent'} ] );
    });
    this.table()
        .tr([ { v: 'Inscrits'},{ v: values.nb_inscrits, f:'int'} ] )
        .tr([ { v: 'Votants'},{ v: values.nb_votants, f:'int'} ] )
        .tr([ { v: 'Suffrages exprimés'},{ v: values.nb_exprimes, f:'int'} ] );
    this       .position(param.event).show();
console.log(values);

}.bind(appBox)


/**************************************** CARTES ***************************************/

const   mapContainer =      new MapComposition('maCarte')
                                .appendTo('mainMap'),
        mapDepartements =   new MapLayer('departements', { autofit:true, primary:'DEP' })
                                .appendTo(mapContainer)
                                .load('./../assets/geomap/departements.topojson');
const   mapCommunes = { };

//Modifie l'opacité de la couche départements en fonction du niveau de zoom

const   zoomScaleDep = d3.scaleLinear().domain([1,7]).range([1,0.05]).clamp(true),
        zoomScaleCom = d3.scaleLinear().domain([1,6]).range([0,1]).clamp(true);

mapContainer.dispatch.on('zoom', zoom => {
    let opacityDep=zoomScaleDep(zoom.level),
        opacityCom=zoomScaleCom(zoom.level);
    mapDepartements.container.style('opacity',opacityDep);
    for (const [k, m] of Object.entries(mapCommunes)){
        m.container.style('opacity',opacityCom);
    }
});












/********************************** MAIN *****************************************/

Promise.all([ dataDepartements.ready, dataCandidats.ready]).then( ()=>  {

    appTitle.appendTo('mainHeader');
    appBox.appendTo('mainMap');

    appNavigator.setLevel(0,'label')
                .setLevel(1,'select')
        .setLevel(2,'autocomplete');
    appNavigator.getLevel(0).data('France');
    appNavigator.getLevel(1).data(dataDepartements, { placeHolder: 'Département', nestKey: 'reg_nom', valueKey:'insee', labelKey:'nom'});
    appNavigator.getLevel(2).hide();
  //  appNavigator.getLevel(2).data(dataDepartements.dataset, {placeHolder: 'Commune', valueKey:'insee', labelKey:'nom'});
    appNavigator.appendTo('mainHeader');
    appNavigator.render();
    appNavigator.dispatch.on('change',(d)=> {
        if (d.index===0) global.departement=0;
        else if (d.index===1) zoomToDept(d.value);
    });





    appPanel.appendTo('mainMap');
    appSelector.data(dataCandidats, { img:'img',color:'couleur',value:'id',label:'nom'}, { path:'assets/img/', check:'check.svg'})
                    .appendTo(appPanel)
                    .render()
                    .select(1);
    appSelector.dispatch.on('select',d=> global.candidat=d.value);







  /*  appDeptSelector.container
        .append('a')
        .attr('href','#')
        .style('margin-left','3rem')
        .text('Retour à la carte de France')
        .on('click', ()=> global.departement=0);*/

    mapDepartements
        .render()
        .join (dataDepartements)
        .dispatch.on('click',(v)=> zoomToDept(v.id));





    //new Title('titrePano',['text']).text('text','Candidats').render().appendTo(appCandSelector);



   /* appDeptSelector
        .data( refDepartements.toGroups('reg_nom'), { nested:true, nameKey:'departement', valueKey: 'id' } )
        .dispatch.on('change', zoomToDept);*/


    global.candidat=1;









/*

    setTimeout(()=>{
        let u=appNavigator.level(1);
        u.select('54');
     //   global.departement=0;
    },4000);*/


});



