from airflow.models import DAG
from airflow.contrib.sensors.file_sensor import FileSensor
from airflow.operators.bash_operator import BashOperator
from airflow.operators.python_operator import PythonOperator
from airflow.operators.dummy_operator import DummyOperator
# from airflow.operators.email_operator import EmailOperator
from datetime import datetime, timedelta

default_args = {
	# "email": ["pedro@wearebo.co"],
	# "email_on_failure": False,
	# "email_on_retry": False,
	"retries": 2,
	"retry_delay": timedelta(minutes=5),
	'sla': timedelta(minutes=90)
}

NEWS_OUTLETS = ['publico', 'observador']

etl_news = DAG(
	dag_id="etl_news",
	description="ETL data from Portuguese newspapers",
	start_date=datetime(2020,7,1),
	schedule_interval="@hourly",
	default_args=default_args,
	dagrun_timeout=timedelta(minutes=60*3),
	catchup=False
)

with etl_news as dag:

	start  = DummyOperator(task_id= "start")

	# sense_raw_files = FileSensor(
	# 	task_id='sense_raw_files',
	# 	filepath="$RESEARCH/media_networks_polarisation/data/raw",
	# 	poke_interval=5
	# )

	clean_raw_data_command = """
	{% for news_outlet in params.news_outlets %}
		sh $RESEARCH/media_networks_polarisation/scripts/wrangle/cleanRawData/{{ news_outlet }}.sh
	{% endfor%}
	"""
	clean_raw_data = BashOperator(
		task_id='clean_raw_data', 
		bash_command=clean_raw_data_command,
		params={"news_outlets": NEWS_OUTLETS}
	)

	create_headers = BashOperator(
		task_id='create_headers', 
		bash_command="sh $RESEARCH/media_networks_polarisation/scripts/wrangle/createHeaders.sh "
	)

	join_clean_data = BashOperator(
		task_id='join_clean_data', 
		bash_command="sh $RESEARCH/media_networks_polarisation/scripts/wrangle/joinData.sh "
	)

	integrate_composite_data = BashOperator(
		task_id='integrate_composite_data', 
		bash_command="sh $RESEARCH/media_networks_polarisation/scripts/wrangle/integrateData.sh "
	)

	stop  = DummyOperator(task_id= "stop")

	start >> clean_raw_data >> create_headers >> join_clean_data >> integrate_composite_data >> stop

	




