import flask

app = flask.Flask(__name__)

@app.route('/')
def root():
    return 'it works'

@app.route('/get_image/<start_date>/<end_date>',methods=["GET"])
def get_image(start_date, end_date):
    print(start_date, end_date)
    return {
	'images':[
			{
				'image_id':123,
				'sensor':'sensor 1',
				'imaging_date':'2022-11-18T09:10:11.231',
				'upload_date':'2022-11-18T09:10:11.231',
				'file_name':'name1.png',
				'pass_id':123
			},
			{
				'image_id':124,
				'sensor':'sensor 2',
				'imaging_date':'2022-11-18T09:10:11.231',
				'upload_date':'2022-11-18T09:10:11.231',
				'file_name':'name2.png',
				'pass_id':123
			}
	]
}

@app.route('/get_area/<imageid>', methods=["GET"])
def get_area(imageid):
    return {
	'areas':['area_name1','area_name2']
}


@app.route('/get_user/<userid>', methods=["GET"])
def get_user(userid):
    return {
	"is_admin":True
}

if '__main__' == __name__:
    app.run(port=12345,host="0.0.0.0",debug=True)
