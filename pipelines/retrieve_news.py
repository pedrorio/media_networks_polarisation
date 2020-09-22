from airflow.models import DAG
from airflow.contrib.sensors.file_sensor import FileSensor
from airflow.operators.bash_operator import BashOperator
from airflow.operators.python_operator import PythonOperator
from airflow.operators.dummy_operator import DummyOperator
from datetime import datetime, timedelta

default_args = {
	"retries": 2,
	"retry_delay": timedelta(minutes=5),
	'sla': timedelta(minutes=90)
}

NEWS_OUTLETS = ['publico', 'observador']

retrieve_news = DAG(
	dag_id="retrieve_news",
	description="Retrieve news from Portuguese newspapers",
	start_date=datetime(2020,7,1),
	schedule_interval="@hourly",
	default_args=default_args,
	dagrun_timeout=timedelta(minutes=60*3),
	catchup=False
)

with retrieve_news as dag:
	start  = DummyOperator(task_id= "start")

    retrieve_newspaper_data_command = """
    	{% for news_outlet in params.news_outlets %}
    		ts-node $RESEARCH/media_networks_polarisation/loader/scripts/{{ news_outlet }}.ts
    	{% endfor%}
    	"""
	retrieve_newspaper_data = BashOperator(
		task_id='retrieve_newspaper_data',
		bash_command=retrieve_newspaper_data_command,
		params={"news_outlets": NEWS_OUTLETS}
	)

	stop  = DummyOperator(task_id= "stop")

	start >> retrieve_newspaper_data >> stop






