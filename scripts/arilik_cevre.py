"""SüperArı · arılık çevresi: OSM Overpass (3 km su kaynakları) + ESA WorldCover 2021 v200 (3 km örtü oranları).
Çıktı: JSON satırları (arilik_cevre). Kullanım: python arilik_cevre.py in.json out.json"""
import json,math,sys,time,urllib.request,urllib.parse
import numpy as np,rasterio
from rasterio.windows import from_bounds
R=6371000.0
def hav(a,b,c,d):
    p1,p2=math.radians(a),math.radians(c);dl=math.radians(d-b);dp=p2-p1
    return 2*R*math.asin(math.sqrt(math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2))
def segd(lat,lon,a,b):
    # nokta-doğru parçası mesafesi (yerel düzlem)
    kx=math.cos(math.radians(lat))*111320;ky=110540
    ax,ay=(a[1]-lon)*kx,(a[0]-lat)*ky;bx,by=(b[1]-lon)*kx,(b[0]-lat)*ky
    dx,dy=bx-ax,by-ay;L=dx*dx+dy*dy;t=0 if L==0 else max(0,min(1,-(ax*dx+ay*dy)/L))
    return math.hypot(ax+t*dx,ay+t*dy)
TUR={'river':'dere','stream':'dere','canal':'kanal','water':'göl/gölet','spring':'kaynak','drinking_water':'çeşme','water_well':'kuyu','fountain':'çeşme','wetland':'sulak alan'}
def overpass(lat,lon):
    q=f'[out:json][timeout:60];(way["waterway"~"^(river|stream|canal)$"](around:3000,{lat},{lon});way["natural"="water"](around:3000,{lat},{lon});relation["natural"="water"](around:3000,{lat},{lon});node["natural"="spring"](around:3000,{lat},{lon});node["amenity"~"^(drinking_water|fountain)$"](around:3000,{lat},{lon});node["man_made"="water_well"](around:3000,{lat},{lon});way["natural"="wetland"](around:3000,{lat},{lon}););out geom;'
    for u in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']:
        try:
            r=urllib.request.Request(u,data=urllib.parse.urlencode({'data':q}).encode(),headers={'User-Agent':'SuperAri/1.0 (superari.vercel.app)'})
            return json.load(urllib.request.urlopen(r,timeout=90))['elements']
        except Exception as e: print('overpass hata',u,e,file=sys.stderr); time.sleep(5)
    return None
def en_yakin(lat,lon,els):
    best=None
    for e in els:
        t=e.get('tags',{});k=t.get('waterway') or t.get('natural') or t.get('amenity') or t.get('man_made')
        if e['type']=='node': d=hav(lat,lon,e['lat'],e['lon'])
        else:
            pts=[(g['lat'],g['lon']) for g in (e.get('geometry') or [])]
            if not pts and e.get('members'): pts=[(g['lat'],g['lon']) for m in e['members'] for g in (m.get('geometry') or [])]
            if not pts: continue
            d=min(segd(lat,lon,pts[i],pts[i+1]) for i in range(len(pts)-1)) if len(pts)>1 else hav(lat,lon,*pts[0])
        if best is None or d<best[0]: best=(d,TUR.get(k,k),t.get('name'))
    return best
SINIF={10:'agac',20:'calilik',30:'cayir',40:'tarim',50:'yerlesim',60:'ciplak',70:'kar',80:'su',90:'sulak',95:'mangrov',100:'yosun'}
def worldcover(lat,lon):
    la=math.floor(lat/3)*3;lo=math.floor(lon/3)*3
    name=f"ESA_WorldCover_10m_2021_v200_{'N' if la>=0 else 'S'}{abs(la):02d}{'E' if lo>=0 else 'W'}{abs(lo):03d}_Map.tif"
    url='/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/'+name
    dl=3000/111320;dlo=3000/(111320*math.cos(math.radians(lat)))
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif'):
        with rasterio.open(url) as ds:
            w=from_bounds(lon-dlo,lat-dl,lon+dlo,lat+dl,ds.transform);a=ds.read(1,window=w)
    h,wd=a.shape;yy,xx=np.mgrid[0:h,0:wd];cy,cx=(h-1)/2,(wd-1)/2
    m=((yy-cy)/(h/2))**2+((xx-cx)/(wd/2))**2<=1
    v=a[m];v=v[v>0];n=v.size
    if not n: return None
    return {SINIF.get(int(c),str(int(c))):round(float((v==c).sum())/n,4) for c in np.unique(v)}
def main():
    aps=json.load(open(sys.argv[1]));out=[]
    for ap in aps:
        lat,lon=float(ap['lat']),float(ap['lon']);els=overpass(lat,lon)
        b=en_yakin(lat,lon,els) if els is not None else None
        try: oc=worldcover(lat,lon)
        except Exception as e: print('worldcover hata',ap['id'],e,file=sys.stderr); oc=None
        out.append(dict(arilik_id=ap['id'],ad=ap.get('name'),lat=lat,lon=lon,su_kaynagi_mesafe_metre=None if b is None else int(round(b[0])),su_kaynagi_turu=None if b is None else b[1],su_kaynagi_adi=None if b is None else b[2],
            su_veri=els is not None,ortu=oc,kaynak='OpenStreetMap katkıcıları (ODbL), Overpass API; ESA WorldCover 10 m 2021 v200 (CC BY 4.0, Zanaga vd. 2022)'))
        print(ap['id'],out[-1]['su_kaynagi_mesafe_metre'],out[-1]['su_kaynagi_turu'],oc,file=sys.stderr);time.sleep(2)
    json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=1)
main()
