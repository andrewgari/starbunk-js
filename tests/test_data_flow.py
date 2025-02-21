import unittest
from unittest.mock import Mock, patch
from src.data_manager import DataManager
from src.config_loader import ConfigLoader

class TestDataFlow(unittest.TestCase):
    def setUp(self):
        self.data_manager = DataManager()
        self.config = ConfigLoader()

    def test_config_loading(self):
        config = self.config.load()
        self.assertIsNotNone(config)
        self.assertTrue(isinstance(config, dict))
        self.assertIn('bot_token', config)

    def test_data_persistence(self):
        test_data = {"key": "value"}
        self.data_manager.save(test_data)
        loaded_data = self.data_manager.load()
        self.assertEqual(test_data, loaded_data)

    @patch('src.data_manager.DataManager.connect')
    def test_database_connection(self, mock_connect):
        mock_connect.return_value = True
        result = self.data_manager.connect()
        self.assertTrue(result)
        mock_connect.assert_called_once()

    def test_data_validation(self):
        invalid_data = {"invalid_key": None}
        with self.assertRaises(ValueError):
            self.data_manager.validate(invalid_data) 